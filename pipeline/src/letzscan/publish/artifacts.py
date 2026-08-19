"""Browser-facing published artifacts.

Every file written here is a *canonical entity*, validated against the generated
schema before it reaches disk. There is deliberately no bespoke "place profile"
envelope: the browser reads arrays of ``Observation`` and the catalogue entities
they refer to, so TypeScript and Python keep agreeing without a new contract to
maintain on both sides.

Layout, following docs/architecture.md §5:

    published/latest.json                                  Release
    published/{release_id}/catalog/sources/{id}.json       Source
    published/{release_id}/catalog/datasets/{id}.json      Dataset
    published/{release_id}/catalog/indicators/{id}.json    Indicator
    published/{release_id}/catalog/geographies/{id}.json   GeographySet
    published/{release_id}/places/{geo_id}.json            Observation[]
    published/{release_id}/national.json                   Observation[]

Publication is atomic by construction: everything is written under an immutable
release id, and ``latest.json`` is written last, so a failed build cannot change
what users see.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from typing import Any

from letzscan.catalog import load_catalog
from letzscan.contracts.models import Geography, Observation, Release, ReleaseOutput
from letzscan.contracts.schemas import validate_entity
from letzscan.publish.release import sha256_bytes

_CONTENT_TYPE = "application/json"


def _jsonable(value: Any) -> Any:
    """YAML gives real ``date`` objects for unquoted dates; JSON needs strings."""
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    return value


class _Writer:
    """Collects every artifact written, with its real size and checksum."""

    def __init__(self, root: Path) -> None:
        self._root = root
        self.outputs: list[ReleaseOutput] = []

    def write(self, relative_path: str, payload: Any) -> None:
        # allow_nan=False on purpose. Python happily writes bare NaN/Infinity
        # tokens, JSON Schema accepts them as numbers, and no browser can parse
        # the result — a file that passes every check here and fails everywhere
        # else. The last gate before bytes hit disk refuses them.
        body = (
            json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False, allow_nan=False)
            + "\n"
        ).encode("utf-8")
        destination = self._root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(body)

        # Checksums are computed from the bytes actually written, not from the
        # object that was meant to be written.
        self.outputs.append(
            ReleaseOutput(
                path=relative_path,
                sha256=sha256_bytes(body),
                bytes=len(body),
                content_type=_CONTENT_TYPE,
            )
        )


def publish_observations(
    destination: Path,
    release_id: str,
    observations: list[Observation],
    geographies: list[Geography],
    dataset_id: str,
    geography_set_id: str,
    catalog_root: Path | None = None,
) -> list[ReleaseOutput]:
    """Write one release's artifacts and return what was written.

    ``latest.json`` is *not* written here — the caller advances the pointer only
    after the release manifest itself validates.
    """
    writer = _Writer(destination / release_id)

    # 1. Catalogue entities, republished verbatim as canonical JSON so the
    #    browser reads licence and attribution as data. A licence string typed
    #    into a React component is a bug; this is how it is avoided.
    entries = {(entry.directory, entry.id): entry for entry in load_catalog(catalog_root)}
    dataset_entry = entries.get(("datasets", dataset_id))
    if dataset_entry is None:
        msg = (
            f"No catalogue entry for dataset {dataset_id!r}; add catalog/datasets/{dataset_id}.yaml"
        )
        raise KeyError(msg)

    data = _jsonable(dataset_entry.data)
    wanted: list[tuple[str, str, str]] = [
        ("datasets", dataset_id, "dataset"),
        ("sources", data["source_id"], "source"),
        ("geographies", geography_set_id, "geography-set"),
    ]
    wanted += [("indicators", indicator, "indicator") for indicator in data["indicator_ids"]]

    for directory, identifier, entity in wanted:
        entry = entries.get((directory, identifier))
        if entry is None:
            msg = (
                f"Dataset {dataset_id!r} references {directory}/{identifier}, "
                "which is not catalogued."
            )
            raise KeyError(msg)

        payload = _jsonable(entry.data)
        if entity == "geography-set":
            # The catalogue declares the set; the gazetteer is produced here, so
            # the published set is the one place both exist together.
            payload = {**payload, "members": [g.to_payload() for g in geographies]}
        if entity == "dataset":
            # The catalogue describes the dataset in full; a release may carry
            # less of it. The artifact must describe the periods it actually
            # contains, or a place page renders coverage the reader cannot find.
            periods = sorted({observation.period for observation in observations})
            payload = {
                **payload,
                "temporal_coverage": {"start": periods[0], "end": periods[-1]},
            }

        validate_entity(entity, payload)
        writer.write(f"catalog/{directory}/{identifier}.json", payload)

    # 2. Observations, split the way the browser reads them: one file per place.
    by_place: dict[str | None, list[Observation]] = {}
    for observation in observations:
        by_place.setdefault(observation.geo_id, []).append(observation)

    for geo_id, rows in by_place.items():
        payload = [
            {**row.to_payload(), "release_id": release_id}
            for row in sorted(rows, key=lambda o: o.period)
        ]
        for row in payload:
            validate_entity("observation", row)

        # `geo_id: null` is national, not a place — it gets its own file rather
        # than a made-up geography id.
        relative = "national.json" if geo_id is None else f"places/{geo_id}.json"
        writer.write(relative, payload)

    return writer.outputs


def write_latest_pointer(destination: Path, release: Release) -> Path:
    """Advance the `latest` pointer. Called only after the release validates."""
    payload = release.to_payload()
    validate_entity("release", payload)

    destination.mkdir(parents=True, exist_ok=True)
    path = destination / "latest.json"
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return path
