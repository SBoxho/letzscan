"""The committed catalogue must always be valid; CI runs this on every change."""

from __future__ import annotations

from pathlib import Path

import yaml

from letzscan.catalog import load_catalog, validate_catalog


def test_committed_catalogue_is_valid() -> None:
    assert validate_catalog() == []


def test_every_source_records_when_its_terms_were_last_read() -> None:
    for entry in load_catalog():
        if entry.directory != "sources":
            continue
        assert entry.data.get("terms_checked_at"), f"{entry.path} is missing terms_checked_at"
        assert entry.data["licence"]["attribution"], f"{entry.path} has no attribution string"


def _write(root: Path, relative: str, data: dict[str, object]) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")


def _source(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "id": "demo",
        "title": "Demo",
        "producer": "Demo producer",
        "canonical_url": "https://example.org/demo",
        "access": "open",
        "licence": {"spdx": "CC0-1.0", "attribution": "Demo producer"},
        "terms_checked_at": "2026-08-17",
        "cadence": "annual",
        "connector": "demo",
    }
    data.update(overrides)
    return data


def test_active_source_without_a_connector_fails(tmp_path: Path) -> None:
    _write(tmp_path, "sources/demo.yaml", _source(status="active"))
    problems = validate_catalog(tmp_path, known_connectors=set())
    assert any("not registered in letzscan.connectors" in problem for problem in problems)


def test_draft_source_does_not_need_a_connector_yet(tmp_path: Path) -> None:
    _write(tmp_path, "sources/demo.yaml", _source(status="draft"))
    assert validate_catalog(tmp_path, known_connectors=set()) == []


def test_file_name_must_match_id(tmp_path: Path) -> None:
    _write(tmp_path, "sources/other-name.yaml", _source())
    problems = validate_catalog(tmp_path, known_connectors={"demo"})
    assert any("file name must match id" in problem for problem in problems)


def test_missing_licence_is_a_validation_failure(tmp_path: Path) -> None:
    source = _source()
    del source["licence"]
    _write(tmp_path, "sources/demo.yaml", source)
    problems = validate_catalog(tmp_path, known_connectors={"demo"})
    assert any("licence" in problem for problem in problems)


def test_dangling_cross_reference_is_reported(tmp_path: Path) -> None:
    _write(tmp_path, "sources/demo.yaml", _source())
    _write(
        tmp_path,
        "geographies/demo-set.yaml",
        {
            "id": "demo-set",
            "title": "Demo set",
            "level": "commune",
            "code_scheme": "LAU",
            "source_id": "does-not-exist",
            "valid_from": "2024-01-01",
        },
    )
    problems = validate_catalog(tmp_path, known_connectors={"demo"})
    assert any("is not in catalog/sources" in problem for problem in problems)
