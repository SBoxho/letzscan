"""STATEC / LUSTAT — total population by commune.

Upstream is the LUSTAT SDMX 2.1 REST service (.Stat Suite / NSI Web Service),
dataflow ``LU1:DF_X021(1.1)`` "Population par canton et commune", served as
SDMX-CSV.

This module is the only place in LëtzScan allowed to know any of the following,
and every one of them is a real quirk of this distribution:

* the dataflow, agency and version triple, and the SDMX key order ``FREQ.CANTON``;
* that the geography dimension is called ``CANTON`` even though it carries
  cantons *and* communes *and* the national total in the same column — summing
  the column without filtering triple-counts the country;
* that ``T`` is the national total, ``C01`` to ``C12`` are cantons and a
  four-digit code is a commune, the first two digits being its canton;
* that an absent value is an empty CSV cell rather than a marker;
* the provider's ``OBS_STATUS`` vocabulary (SDMX ``CL_OBS_STATUS``), in which
  ``c``/``C`` is confidential and ``q``/``Q`` is "missing value: suppressed";
* that the reference date of period ``YYYY`` is 1 January of that year.

Nothing below this module sees ``CANTON``, ``OBS_VALUE``, ``OBS_STATUS`` or a
four-digit bare commune code. Downstream sees canonical
:class:`~letzscan.contracts.models.Observation` records keyed by ``lu.commune.*``.
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
import xml.etree.ElementTree as ElementTree
from pathlib import Path

from letzscan.connectors.base import ConnectorResult, Provenance, utc_now
from letzscan.contracts.models import Geography, Observation, ObservationStatus
from letzscan.normalize import parse_number, parse_year
from letzscan.paths import fixtures_dir

SOURCE_ID = "statec-lustat"
DATASET_ID = "statec-lustat.population-by-commune"
INDICATOR_ID = "population.total"
GEOGRAPHY_SET_ID = "lu-communes"

#: Canonical unit. The provider does not label the measure; DF_X021 counts persons.
UNIT = "person"

# --- Provider specifics. Nothing below this line may leak downstream. ---------

#: Agency, dataflow and version, exactly as LUSTAT publishes them. Pinned rather
#: than "latest" on purpose: a version bump reshapes the series and must fail
#: loudly here instead of quietly changing what the site publishes.
_AGENCY = "LU1"
_DATAFLOW = "DF_X021"
_VERSION = "1.1"

#: Value of the CSV ``DATAFLOW`` column when the pinned dataflow is served.
_EXPECTED_DATAFLOW = f"{_AGENCY}:{_DATAFLOW}({_VERSION})"

#: Read-only SDMX-CSV request. The key ``A.`` pins the annual frequency and
#: leaves the geography dimension open.
DISTRIBUTION_URL = f"https://lustat.statec.lu/rest/data/{_AGENCY},{_DATAFLOW},{_VERSION}/A."

#: ``labels=id`` asks for codes rather than display names — names are
#: presentation, codes are the join key. It is a *media type parameter*: passing
#: `labels` as a query parameter returns HTTP 422.
DISTRIBUTION_ACCEPT = "application/vnd.sdmx.data+csv;charset=utf-8;labels=id"

_COL_DATAFLOW = "DATAFLOW"
_COL_FREQ = "FREQ"
_COL_GEO = "CANTON"
_COL_PERIOD = "TIME_PERIOD"
_COL_VALUE = "OBS_VALUE"
_COL_STATUS = "OBS_STATUS"

#: The only frequency this dataflow publishes. Anything else is a reshape.
_EXPECTED_FREQ = "A"

_NATIONAL_CODE = "T"
_CANTON_CODE = re.compile(r"^C\d{2}$")
_COMMUNE_CODE = re.compile(r"^\d{4}$")

#: Provider ``OBS_STATUS`` code -> canonical status, from the producer's own
#: ``CL_OBS_STATUS`` codelist. Both cases are published; SDMX treats them as
#: distinct codes, so both are mapped rather than lowercased blindly.
#:
#: Only codes whose canonical meaning is unambiguous are mapped. An unknown code
#: is an error, not an "assume observed": silently trusting a status we have
#: never seen is how a suppressed value becomes a published number.
_STATUS_BY_PROVIDER_CODE: dict[str, ObservationStatus] = {
    "a": ObservationStatus.OBSERVED,
    "b": ObservationStatus.OBSERVED,  # break in series; the value itself is real
    "c": ObservationStatus.SUPPRESSED,  # confidential
    "e": ObservationStatus.ESTIMATED,
    "f": ObservationStatus.ESTIMATED,  # forecast
    "g": ObservationStatus.ESTIMATED,  # experimental
    "h": ObservationStatus.MISSING,  # missing: holiday or weekend
    "i": ObservationStatus.ESTIMATED,  # imputed
    "l": ObservationStatus.MISSING,  # not available / collected
    "m": ObservationStatus.MISSING,  # missing: cannot exist
    "o": ObservationStatus.MISSING,
    "p": ObservationStatus.PROVISIONAL,
    "q": ObservationStatus.SUPPRESSED,  # missing value: suppressed
    "r": ObservationStatus.REVISED,
    "u": ObservationStatus.OBSERVED,  # low reliability; still an observed figure
    "v": ObservationStatus.OBSERVED,  # unvalidated
}


class UpstreamShapeError(ValueError):
    """The distribution is not the shape this connector was written against.

    Raised rather than skipped. A provider reshape must fail a build; it must
    never thin a published series into something that still looks plausible.
    """


def _canonical_status(raw_status: str, value: float | None, raw_value: str) -> ObservationStatus:
    """Map a provider status code, defaulting only when the provider is silent."""
    code = raw_status.strip()
    if code:
        mapped = _STATUS_BY_PROVIDER_CODE.get(code) or _STATUS_BY_PROVIDER_CODE.get(code.lower())
        if mapped is None:
            msg = (
                f"Unknown upstream observation status {raw_status!r}. Re-read "
                "CL_OBS_STATUS and map it deliberately before publishing."
            )
            raise UpstreamShapeError(msg)
        return mapped

    if value is not None:
        return ObservationStatus.OBSERVED

    # No status flag and no number. An *empty* cell means the producer published
    # nothing at all — that is 'missing'. A cell holding a marker such as ``c``
    # (confidential) or ``:`` means the producer had a figure and withheld it —
    # that is 'suppressed'. Same vocabulary as OBS_STATUS, different column, and
    # the two must not collapse into one status.
    return ObservationStatus.MISSING if raw_value == "" else ObservationStatus.SUPPRESSED


def _population_count(value: float, where: str, period: str) -> float:
    """Reject a number that cannot be a count of residents.

    ``parse_number`` is a permissive shared helper — it accepts anything Python's
    ``float()`` accepts. That is right for the general case and wrong here: this
    dataflow declares ``DECIMALS`` as ``0`` on every row, so a population is a
    finite, non-negative whole number and anything else is a parse that went
    wrong rather than a figure worth publishing.

    ``NaN`` matters especially: it satisfies the canonical contract, survives
    JSON Schema validation, and is then serialised by ``json.dumps`` as a bare
    ``NaN`` token that no browser can parse. It has to die here.
    """
    if value != value or value in (float("inf"), float("-inf")):
        msg = f"{where} {period}: non-finite population value {value!r}."
        raise UpstreamShapeError(msg)
    if value < 0:
        msg = f"{where} {period}: negative population value {value!r}."
        raise UpstreamShapeError(msg)
    if value != int(value):
        msg = (
            f"{where} {period}: fractional population value {value!r}. A thousands "
            "separator read as a decimal point looks exactly like this."
        )
        raise UpstreamShapeError(msg)
    return value


#: SDMX 2.1 structure-message namespaces, needed to read the codelist that
#: carries commune names.
_SDMX_STRUCTURE = "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/structure"
_SDMX_COMMON = "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/common"
_XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"

#: Codelist name language to prefer. LUSTAT publishes `en` and `fr`; commune
#: names are proper nouns and identical in both, but a language must be picked
#: explicitly rather than by dictionary order.
_NAME_LANGUAGE = "fr"

CODELIST_URL = f"https://lustat.statec.lu/rest/codelist/{_AGENCY}/CL_CANTON_COMMUNE/latest"


class StatecLustatConnector:
    """Turns LUSTAT ``DF_X021`` into canonical population observations."""

    id = "statec-lustat"

    def __init__(self, fixture: Path | None = None, codelist: Path | None = None) -> None:
        #: Offline by default: tests and `letzscan run` read a recorded payload,
        #: so neither CI nor a laptop calls STATEC. Point this at a freshly
        #: downloaded response to re-record.
        self._fixture = fixture or fixtures_dir() / "statec-lustat" / "population-by-commune.csv"
        self._codelist = (
            codelist or fixtures_dir() / "statec-lustat" / "canton-commune-codelist.xml"
        )

    def commune_names(self) -> dict[str, str]:
        """Read ``CL_CANTON_COMMUNE`` into ``{LAU code: name}``.

        The codelist spans the code space over time — it carries 104 commune
        codes, including the four retired by the 2023 mergers — so it says what a
        code is *called*, never which codes are currently in force.
        """
        root = ElementTree.parse(self._codelist).getroot()
        names: dict[str, str] = {}

        for code in root.iter(f"{{{_SDMX_STRUCTURE}}}Code"):
            identifier = (code.get("id") or "").strip()
            if not _COMMUNE_CODE.match(identifier):
                continue  # cantons and the national total are not communes

            by_language = {
                element.get(_XML_LANG): (element.text or "").strip()
                for element in code.findall(f"{{{_SDMX_COMMON}}}Name")
            }
            name = by_language.get(_NAME_LANGUAGE) or next(
                (value for value in by_language.values() if value), ""
            )
            if not name:
                msg = f"Commune code {identifier!r} has no name in the LUSTAT codelist."
                raise UpstreamShapeError(msg)
            names[identifier] = name

        if not names:
            msg = "LUSTAT codelist contained no commune codes."
            raise UpstreamShapeError(msg)
        return names

    def geographies(self, valid_from: str) -> list[Geography]:
        """Canonical gazetteer for the communes this source currently publishes.

        Membership is taken from the *data*, not from the codelist: a code is a
        current commune when the producer publishes a figure for it in the latest
        period. The codelist spans the code space over time and so cannot say
        which codes are in force. This set was checked on 2026-08-19 against
        STATEC's own LAU register ("codes UAL au 01.09.2023 (100 communes)") and
        matched exactly.

        The latest period is only trusted when it is *complete*. A single row for
        a period STATEC has begun publishing early would otherwise redefine the
        country as that one commune, and — because the app answers "is this a
        real place?" from this gazetteer — every other commune would render as
        "unknown place" while its data sat published in the same release.
        """
        observations, _ = self._parse(self._fixture.read_bytes())

        communes_by_period: dict[str, set[str]] = {}
        for observation in observations:
            if observation.geo_id is not None:
                communes_by_period.setdefault(observation.period, set()).add(
                    observation.geo_id.removeprefix("lu.commune.")
                )

        latest = max(communes_by_period)
        fullest = max(communes_by_period, key=lambda period: len(communes_by_period[period]))
        if len(communes_by_period[latest]) != len(communes_by_period[fullest]):
            msg = (
                f"Period {latest} carries {len(communes_by_period[latest])} communes but "
                f"{fullest} carries {len(communes_by_period[fullest])}. Either {latest} is "
                "incomplete, or the boundary version changed — which needs a new geography "
                "set and a crosswalk, not a silently resized gazetteer."
            )
            raise UpstreamShapeError(msg)

        current = sorted(communes_by_period[latest])
        names = self.commune_names()
        unnamed = [code for code in current if code not in names]
        if unnamed:
            msg = f"No name in the LUSTAT codelist for commune code(s) {unnamed}."
            raise UpstreamShapeError(msg)

        return [
            Geography(
                id=f"lu.commune.{code}",
                set_id=GEOGRAPHY_SET_ID,
                code=code,
                name=names[code],
                level="commune",
                valid_from=valid_from,
            )
            for code in current
        ]

    def fetch(self) -> ConnectorResult:
        raw_bytes = self._fixture.read_bytes()
        provenance = Provenance(
            source_id=SOURCE_ID,
            fetched_at=utc_now(),
            location=str(self._fixture),
            sha256=hashlib.sha256(raw_bytes).hexdigest(),
        )
        observations, warnings = self._parse(raw_bytes)
        return ConnectorResult(provenance=provenance, observations=observations, warnings=warnings)

    def _parse(self, raw_bytes: bytes) -> tuple[list[Observation], list[str]]:
        # LUSTAT serves UTF-8 and commune names carry umlauts (Käerjeng). Decode
        # strictly: mojibake in a join key is worse than a failed build.
        # `utf-8-sig` because a byte-order mark would otherwise turn the first
        # column name into a mystery rather than a readable error.
        reader = csv.DictReader(io.StringIO(raw_bytes.decode("utf-8-sig")))

        # OBS_STATUS is required, not optional. If the provider dropped it, every
        # suppression flag would vanish and a withheld value would publish as a
        # number — the one reshape that can turn an absence into a figure.
        missing_columns = {
            _COL_DATAFLOW,
            _COL_FREQ,
            _COL_GEO,
            _COL_PERIOD,
            _COL_VALUE,
            _COL_STATUS,
        } - set(reader.fieldnames or [])
        if missing_columns:
            msg = (
                f"LUSTAT response is missing expected column(s) "
                f"{sorted(missing_columns)}; got {reader.fieldnames}."
            )
            raise UpstreamShapeError(msg)

        observations: list[Observation] = []
        warnings: list[str] = []
        skipped_cantons = 0
        seen: set[tuple[str | None, str]] = set()

        required = (
            _COL_DATAFLOW,
            _COL_FREQ,
            _COL_GEO,
            _COL_PERIOD,
            _COL_VALUE,
            _COL_STATUS,
        )

        for line, row in enumerate(reader, start=2):
            # csv fills absent fields with None, so a short row means the payload
            # was cut mid-record. An empty *value* is a legitimate `""`; a value
            # key that is None is a truncated download, and truncation must never
            # publish the digits it happened to reach.
            if any(row.get(column) is None for column in required):
                msg = (
                    f"Truncated row at line {line}: expected {len(required)} declared "
                    "columns. The response was cut mid-record."
                )
                raise UpstreamShapeError(msg)

            dataflow = (row.get(_COL_DATAFLOW) or "").strip()
            if dataflow != _EXPECTED_DATAFLOW:
                msg = (
                    f"Expected dataflow {_EXPECTED_DATAFLOW!r}, got {dataflow!r}. "
                    "A version bump can reorder dimensions; re-read the DSD."
                )
                raise UpstreamShapeError(msg)

            frequency = (row.get(_COL_FREQ) or "").strip()
            if frequency != _EXPECTED_FREQ:
                msg = f"Expected annual frequency {_EXPECTED_FREQ!r}, got {frequency!r}."
                raise UpstreamShapeError(msg)

            code = (row.get(_COL_GEO) or "").strip()

            # Cantons share the column with communes. They are dropped because no
            # canton geography set is catalogued yet — counted, not silently lost.
            if _CANTON_CODE.match(code):
                skipped_cantons += 1
                continue

            if code == _NATIONAL_CODE:
                geo_id: str | None = None  # explicit null: national, not unknown
            elif _COMMUNE_CODE.match(code):
                geo_id = f"lu.commune.{code}"
            else:
                msg = (
                    f"Unrecognised geography code {code!r} in the LUSTAT geography "
                    "dimension; expected 'T', 'Cnn' or a four-digit commune code."
                )
                raise UpstreamShapeError(msg)

            period = parse_year(row[_COL_PERIOD])
            key = (geo_id, period)
            if key in seen:
                # Two figures for the same place and period cannot both be true,
                # and "last row wins" would publish whichever the provider
                # happened to serialise second.
                msg = (
                    f"Duplicate observation for {geo_id or 'national'} {period}. "
                    "The distribution should carry one value per place per period."
                )
                raise UpstreamShapeError(msg)
            seen.add(key)

            raw_value = (row.get(_COL_VALUE) or "").strip()
            value = parse_number(raw_value)
            if value is not None:
                value = _population_count(value, geo_id or "national", period)
            status = _canonical_status(row.get(_COL_STATUS) or "", value, raw_value)

            if status in {ObservationStatus.SUPPRESSED, ObservationStatus.MISSING}:
                # Carried to /status rather than swallowed: a hole in a published
                # series should be visible, and must never be read as zero.
                where = geo_id or "national"
                reason = (
                    "withheld upstream"
                    if status is ObservationStatus.SUPPRESSED
                    else "no figure published upstream"
                )
                warnings.append(
                    f"{where} {period}: {reason}, recorded as {status.value} rather than zero."
                )
                value = None

            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    geo_id=geo_id,
                    period=period,
                    value=value,
                    unit=UNIT,
                    status=status,
                    dataset_id=DATASET_ID,
                    source_id=SOURCE_ID,
                )
            )

        if not observations:
            # Never let an empty parse look like a successful build.
            msg = "LUSTAT response contained no commune or national observations."
            raise UpstreamShapeError(msg)

        if skipped_cantons:
            warnings.append(
                f"Skipped {skipped_cantons} canton-level rows: DF_X021 mixes cantons, "
                "communes and the national total in one dimension, and no canton "
                "geography set is catalogued yet."
            )

        return observations, warnings
