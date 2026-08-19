"""Connector tests for STATEC LUSTAT DF_X021 (population by commune).

The fixture is a verbatim recording of a real SDMX-CSV response — see
``fixtures/statec-lustat/README.md`` for the exact request and the date it was
made. Values asserted here are therefore real published figures, not invented
ones, and a change to them is a genuine upstream change.

Cases the provider does not currently exercise (a suppression flag, a reshaped
payload) are driven by CSVs constructed *in the test*, never by a hand-written
file under ``fixtures/`` that could later be mistaken for a recording.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from letzscan.connectors.statec_lustat import (
    StatecLustatConnector,
    UpstreamShapeError,
)
from letzscan.contracts import validate_entity
from letzscan.contracts.models import ObservationStatus

_HEADER = (
    "DATAFLOW,FREQ,CANTON,TIME_PERIOD,OBS_VALUE,"
    "NOTE_YEAR_2,NOTE_YEAR_1,NOTE_CANTON_2,NOTE_CANTON_1,OBS_STATUS,DECIMALS"
)


def _csv(tmp_path: Path, *rows: str, header: str = _HEADER) -> Path:
    path = tmp_path / "payload.csv"
    path.write_text("\n".join((header, *rows)) + "\n", encoding="utf-8")
    return path


# --- The recorded fixture ----------------------------------------------------


def test_recorded_fixture_emits_canonical_observations() -> None:
    result = StatecLustatConnector().fetch()

    assert result.observations
    for observation in result.observations:
        validate_entity("observation", observation.to_payload())


def test_real_published_figures_are_parsed_exactly() -> None:
    """Luxembourg City, 1 January 2026, as published by STATEC in DF_X021."""
    result = StatecLustatConnector().fetch()
    by_key = {(o.geo_id, o.period): o for o in result.observations}

    assert by_key[("lu.commune.0304", "2026")].value == 137678.0
    assert by_key[("lu.commune.0101", "2026")].value == 4721.0
    # The two communes created by the 2023 mergers resolve like any other.
    assert by_key[("lu.commune.0711", "2026")].value == 2390.0
    assert by_key[("lu.commune.1209", "2026")].value == 3368.0


def test_national_total_is_an_explicit_null_geography_not_a_commune() -> None:
    result = StatecLustatConnector().fetch()
    national = [o for o in result.observations if o.geo_id is None]

    assert national, "the T row must survive as a national observation"
    latest = next(o for o in national if o.period == "2026")
    assert latest.value == 690959.0
    # `geo_id: null` means national, and must serialise as an explicit null.
    assert "geo_id" in latest.to_payload()
    assert latest.to_payload()["geo_id"] is None


def test_every_current_commune_is_covered() -> None:
    """The 100 communes in force since 1 September 2023, and nothing else."""
    result = StatecLustatConnector().fetch()
    communes = {o.geo_id for o in result.observations if o.geo_id is not None}

    assert len(communes) == 100
    # The four codes retired by the 2023 mergers must not reappear.
    for retired in ("0705", "0710", "1201", "1208"):
        assert f"lu.commune.{retired}" not in communes


def test_commune_values_sum_to_the_published_national_total() -> None:
    """Guards the trap: cantons share the geography column with communes.

    If a canton row leaked through, this sum would exceed the national total —
    the country would be counted roughly twice over.
    """
    result = StatecLustatConnector().fetch()
    communes = [
        o
        for o in result.observations
        if o.geo_id is not None and o.period == "2026" and o.value is not None
    ]
    national = next(o for o in result.observations if o.geo_id is None and o.period == "2026")

    assert len(communes) == 100
    assert sum(o.value for o in communes) == national.value == 690959.0


def test_canton_rows_are_excluded_and_the_exclusion_is_reported() -> None:
    result = StatecLustatConnector().fetch()

    # Canton C07 (Redange) is 21 701 in 2026; it must not surface as a figure.
    assert 21701.0 not in {o.value for o in result.observations if o.period == "2026"}
    assert any("canton" in warning.lower() for warning in result.warnings)


# --- Missing and suppressed are distinct, and neither is zero ---------------


def test_real_missing_value_is_missing_not_zero() -> None:
    """Groussbus-Wal 2010 is genuinely absent upstream — an empty CSV cell."""
    result = StatecLustatConnector().fetch()
    gap = next(
        o for o in result.observations if o.geo_id == "lu.commune.0711" and o.period == "2010"
    )

    assert gap.value is None
    assert gap.value != 0
    assert gap.status == ObservationStatus.MISSING
    assert any("0711" in warning and "2010" in warning for warning in result.warnings)


def test_treating_the_missing_value_as_zero_would_visibly_corrupt_the_total() -> None:
    """Why "missing is missing" is a data rule and not a style preference.

    In 2010 the commune figures sum to 500 333 against a published national
    total of 502 066. The 1 733-person gap is Groussbus-Wal, whose figure STATEC
    did not publish that year. Coercing it to zero would silently understate the
    country — and the error would look like a plausible number.
    """
    result = StatecLustatConnector().fetch()
    communes = [
        o
        for o in result.observations
        if o.geo_id is not None and o.period == "2010" and o.value is not None
    ]
    national = next(o for o in result.observations if o.geo_id is None and o.period == "2010")

    assert len(communes) == 99, "one commune has no published 2010 figure"
    assert sum(o.value for o in communes) == 500333.0
    assert national.value == 502066.0
    assert sum(o.value for o in communes) < national.value


def test_missing_value_serialises_as_an_explicit_null() -> None:
    result = StatecLustatConnector().fetch()
    gap = next(
        o for o in result.observations if o.geo_id == "lu.commune.0711" and o.period == "2010"
    )

    payload = gap.to_payload()
    assert payload["value"] is None
    validate_entity("observation", payload)


@pytest.mark.parametrize("code", ["c", "C", "q", "Q"])
def test_provider_suppression_flags_become_suppressed_never_zero(tmp_path: Path, code: str) -> None:
    """`c` (confidential) and `q` (suppressed) in the producer's CL_OBS_STATUS.

    DF_X021 carries no flagged rows today, so this drives the declared-but-unused
    path with a payload built here rather than a fake recording.
    """
    payload = _csv(tmp_path, f"LU1:DF_X021(1.1),A,0304,2026,,,,,,{code},0")
    result = StatecLustatConnector(fixture=payload).fetch()

    observation = result.observations[0]
    assert observation.status == ObservationStatus.SUPPRESSED
    assert observation.value is None
    assert any("suppressed" in warning for warning in result.warnings)


def test_suppressed_and_missing_are_not_the_same_status(tmp_path: Path) -> None:
    payload = _csv(
        tmp_path,
        "LU1:DF_X021(1.1),A,0304,2026,,,,,,c,0",
        "LU1:DF_X021(1.1),A,0101,2026,,,,,,,0",
    )
    statuses = {
        o.geo_id: o.status for o in StatecLustatConnector(fixture=payload).fetch().observations
    }

    assert statuses["lu.commune.0304"] == ObservationStatus.SUPPRESSED
    assert statuses["lu.commune.0101"] == ObservationStatus.MISSING


def test_a_suppressed_flag_beats_a_present_value(tmp_path: Path) -> None:
    """A flagged row must not publish its number, even if one is present."""
    payload = _csv(tmp_path, "LU1:DF_X021(1.1),A,0304,2026,137678,,,,,c,0")
    observation = StatecLustatConnector(fixture=payload).fetch().observations[0]

    assert observation.status == ObservationStatus.SUPPRESSED
    assert observation.value is None


# --- The boundary ------------------------------------------------------------


def test_no_provider_field_names_survive_the_boundary() -> None:
    """The rule the repository is arranged around. See ADR 0002."""
    result = StatecLustatConnector().fetch()
    serialised = json.dumps([o.to_payload() for o in result.observations])

    for provider_token in (
        "CANTON",
        "OBS_VALUE",
        "OBS_STATUS",
        "TIME_PERIOD",
        "DATAFLOW",
        "FREQ",
        "DECIMALS",
        "NOTE_YEAR_1",
        "NOTE_CANTON_1",
        "DF_X021",
        "LU1",
        "SDMX",
    ):
        assert provider_token not in serialised


def test_bare_provider_codes_never_become_geography_ids() -> None:
    """`0304` is a provider code; `lu.commune.0304` is a LëtzScan identifier."""
    result = StatecLustatConnector().fetch()

    for observation in result.observations:
        assert observation.geo_id is None or observation.geo_id.startswith("lu.commune.")
    assert not any(o.geo_id == "0304" for o in result.observations)
    assert not any(o.geo_id == "T" for o in result.observations)


# --- A reshaped upstream fails the build, it does not thin the data ----------


def test_a_dataflow_version_bump_fails_loudly(tmp_path: Path) -> None:
    payload = _csv(tmp_path, "LU1:DF_X021(1.2),A,0304,2026,137678,,,,,,0")

    with pytest.raises(UpstreamShapeError, match="dataflow"):
        StatecLustatConnector(fixture=payload).fetch()


def test_a_renamed_column_fails_loudly(tmp_path: Path) -> None:
    payload = _csv(
        tmp_path,
        "LU1:DF_X021(1.1),A,0304,2026,137678,,,,,,0",
        header=_HEADER.replace("OBS_VALUE", "VALEUR"),
    )

    with pytest.raises(UpstreamShapeError, match="missing expected column"):
        StatecLustatConnector(fixture=payload).fetch()


def test_an_unexpected_frequency_fails_loudly(tmp_path: Path) -> None:
    payload = _csv(tmp_path, "LU1:DF_X021(1.1),M,0304,2026,137678,,,,,,0")

    with pytest.raises(UpstreamShapeError, match="frequency"):
        StatecLustatConnector(fixture=payload).fetch()


def test_an_unknown_geography_code_fails_loudly(tmp_path: Path) -> None:
    payload = _csv(tmp_path, "LU1:DF_X021(1.1),A,XX99,2026,137678,,,,,,0")

    with pytest.raises(UpstreamShapeError, match="geography code"):
        StatecLustatConnector(fixture=payload).fetch()


def test_an_unmapped_status_code_fails_rather_than_assuming_observed(
    tmp_path: Path,
) -> None:
    payload = _csv(tmp_path, "LU1:DF_X021(1.1),A,0304,2026,137678,,,,,zz,0")

    with pytest.raises(UpstreamShapeError, match="status"):
        StatecLustatConnector(fixture=payload).fetch()


def test_an_empty_payload_is_an_error_not_a_successful_empty_release(
    tmp_path: Path,
) -> None:
    with pytest.raises(UpstreamShapeError, match="no commune or national"):
        StatecLustatConnector(fixture=_csv(tmp_path)).fetch()


# --- Provenance --------------------------------------------------------------


def test_provenance_records_a_timezone_aware_fetch_time_and_a_checksum() -> None:
    provenance = StatecLustatConnector().fetch().provenance

    assert provenance.source_id == "statec-lustat"
    assert provenance.fetched_at.tzinfo is not None
    assert len(provenance.sha256) == 64
