from __future__ import annotations

import json
from pathlib import Path

import pytest

from letzscan.cli import main
from letzscan.connectors.example_local import ExampleLocalConnector
from letzscan.contracts import validate_entity
from letzscan.contracts.schemas import SchemaValidationError
from letzscan.publish import build_release, write_release


def test_release_manifest_satisfies_the_canonical_contract(tmp_path: Path) -> None:
    result = ExampleLocalConnector().fetch()
    release = build_release("test-release", "2026-08-17T10:00:00Z", [result])

    validate_entity("release", release.to_payload())
    path = write_release(release, tmp_path)

    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["status"] == "draft"
    assert manifest["inputs"][0]["sha256"] == result.provenance.sha256


def test_connector_warnings_reach_the_manifest_rather_than_being_swallowed() -> None:
    result = ExampleLocalConnector().fetch()
    release = build_release("test-release", "2026-08-17T10:00:00Z", [result])
    assert release.warnings


def test_invalid_manifest_never_reaches_disk(tmp_path: Path) -> None:
    result = ExampleLocalConnector().fetch()
    release = build_release("Not A Valid Id", "2026-08-17T10:00:00Z", [result])

    with pytest.raises(SchemaValidationError):
        write_release(release, tmp_path)
    assert not (tmp_path / "release.json").exists()


def test_cli_run_writes_observations_and_a_manifest(tmp_path: Path) -> None:
    assert main(["run", "example-local", "--out", str(tmp_path)]) == 0

    releases = list(tmp_path.iterdir())
    assert len(releases) == 1

    observations = json.loads((releases[0] / "observations.json").read_text(encoding="utf-8"))
    assert len(observations) == 3
    assert (releases[0] / "release.json").is_file()


def test_cli_validate_catalog_passes_on_the_committed_catalogue() -> None:
    assert main(["validate-catalog"]) == 0


def test_cli_rejects_an_unknown_connector() -> None:
    assert main(["run", "nope", "--out", "."]) == 1
