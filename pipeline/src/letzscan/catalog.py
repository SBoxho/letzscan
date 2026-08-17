"""Reading and validating the reviewed catalogue.

``catalog/`` is the single source of truth for source metadata, licences,
attribution and cadence. Product code reads it; nobody retypes a licence string
into a component.

Validation is two-layered:
  1. every file must satisfy its generated JSON Schema;
  2. cross-references must resolve, and an *active* source must have a
     connector that actually exists in code.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from letzscan.contracts.schemas import iter_errors
from letzscan.paths import catalog_dir

#: catalogue directory -> canonical entity used to validate its files.
DIRECTORY_ENTITIES: dict[str, str] = {
    "sources": "source",
    "indicators": "indicator",
    "geographies": "geography-set",
    "datasets": "dataset",
}


@dataclass(frozen=True, slots=True)
class CatalogEntry:
    directory: str
    entity: str
    path: Path
    data: dict[str, Any]

    @property
    def id(self) -> str:
        identifier = self.data.get("id")
        return identifier if isinstance(identifier, str) else ""


def load_catalog(root: Path | None = None) -> list[CatalogEntry]:
    """Load every YAML file under the known catalogue directories."""
    base = root or catalog_dir()
    entries: list[CatalogEntry] = []

    for directory, entity in DIRECTORY_ENTITIES.items():
        folder = base / directory
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.yaml")):
            with path.open(encoding="utf-8") as handle:
                data = yaml.safe_load(handle)
            if not isinstance(data, dict):
                msg = f"{path} does not contain a YAML mapping"
                raise ValueError(msg)
            entries.append(CatalogEntry(directory=directory, entity=entity, path=path, data=data))

    return entries


def validate_catalog(
    root: Path | None = None, known_connectors: set[str] | None = None
) -> list[str]:
    """Return a list of problems. Empty means the catalogue is valid."""
    if known_connectors is None:
        from letzscan.connectors import CONNECTORS

        known_connectors = set(CONNECTORS)

    base = root or catalog_dir()
    entries = load_catalog(base)
    problems: list[str] = []

    def rel(path: Path) -> str:
        try:
            return str(path.relative_to(base.parent))
        except ValueError:
            return str(path)

    # 1. Schema conformance ---------------------------------------------------
    for entry in entries:
        for error in iter_errors(entry.entity, entry.data):
            problems.append(f"{rel(entry.path)}: {error}")

    # 2. Identity -------------------------------------------------------------
    seen: dict[tuple[str, str], Path] = {}
    for entry in entries:
        if not entry.id:
            continue
        if entry.path.stem != entry.id:
            problems.append(
                f"{rel(entry.path)}: file name must match id {entry.id!r} "
                "so a catalogue entry is findable by id"
            )
        key = (entry.directory, entry.id)
        if key in seen:
            problems.append(f"{rel(entry.path)}: duplicate id {entry.id!r}")
        seen[key] = entry.path

    ids_by_directory = {
        directory: {entry.id for entry in entries if entry.directory == directory}
        for directory in DIRECTORY_ENTITIES
    }

    # 3. Cross-references and the connector boundary --------------------------
    for entry in entries:
        data = entry.data

        if entry.directory == "sources":
            connector = data.get("connector")
            status = data.get("status", "draft")
            if status == "active" and connector not in known_connectors:
                problems.append(
                    f"{rel(entry.path)}: source is active but connector {connector!r} "
                    f"is not registered in letzscan.connectors "
                    f"(known: {', '.join(sorted(known_connectors)) or 'none'})"
                )

        if entry.directory == "indicators":
            denominator = data.get("denominator_indicator_id")
            if denominator and denominator not in ids_by_directory["indicators"]:
                problems.append(
                    f"{rel(entry.path)}: denominator_indicator_id {denominator!r} "
                    "is not a known indicator"
                )

        if entry.directory in {"geographies", "datasets"}:
            source_id = data.get("source_id")
            if source_id and source_id not in ids_by_directory["sources"]:
                problems.append(
                    f"{rel(entry.path)}: source_id {source_id!r} is not in catalog/sources"
                )

        if entry.directory == "datasets":
            for indicator_id in data.get("indicator_ids", []):
                if indicator_id not in ids_by_directory["indicators"]:
                    problems.append(
                        f"{rel(entry.path)}: indicator_id {indicator_id!r} "
                        "is not in catalog/indicators"
                    )
            geography_set_id = data.get("geography_set_id")
            if geography_set_id and geography_set_id not in ids_by_directory["geographies"]:
                problems.append(
                    f"{rel(entry.path)}: geography_set_id {geography_set_id!r} "
                    "is not in catalog/geographies"
                )

    return problems
