"""The artifacts the browser actually reads.

Two things are asserted here that nothing else can catch: that every published
file is a canonical entity, and that the manifest's checksums describe the bytes
that were really written. A manifest that describes bytes nobody wrote is worse
than no manifest — it makes a corrupted release look verified.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from letzscan.cli import main
from letzscan.contracts import validate_entity
from letzscan.paths import fixtures_dir, repo_root

#: The small snapshot committed so `npm run dev` renders real data offline.
DEV_SNAPSHOT = repo_root() / "apps" / "web" / "public" / "data"


@pytest.fixture(scope="module")
def published(tmp_path_factory: pytest.TempPathFactory) -> Path:
    destination = tmp_path_factory.mktemp("published")
    assert main(["publish", "statec-lustat", "--out", str(destination), "--since", "2025"]) == 0
    return destination


def _release(root: Path) -> dict:
    return json.loads((root / "latest.json").read_text(encoding="utf-8"))


def test_publish_writes_a_validating_release_pointer(published: Path) -> None:
    release = _release(published)

    validate_entity("release", release)
    assert release["status"] == "published"
    assert release["inputs"][0]["source_id"] == "statec-lustat"


def test_every_manifest_checksum_describes_the_bytes_on_disk(published: Path) -> None:
    release = _release(published)
    base = published / release["id"]

    assert release["outputs"], "a release that published nothing is not a release"
    for output in release["outputs"]:
        body = (base / output["path"]).read_bytes()
        assert hashlib.sha256(body).hexdigest() == output["sha256"], output["path"]
        assert len(body) == output["bytes"], output["path"]


def test_published_files_are_canonical_entities(published: Path) -> None:
    release = _release(published)
    base = published / release["id"]
    entities = {
        "catalog/sources/": "source",
        "catalog/datasets/": "dataset",
        "catalog/indicators/": "indicator",
        "catalog/geographies/": "geography-set",
    }

    seen = set()
    for output in release["outputs"]:
        payload = json.loads((base / output["path"]).read_text(encoding="utf-8"))
        entity = next((e for p, e in entities.items() if output["path"].startswith(p)), None)

        if entity is not None:
            validate_entity(entity, payload)
            seen.add(entity)
        else:
            # Everything else is an array of observations.
            assert isinstance(payload, list)
            for observation in payload:
                validate_entity("observation", observation)

    assert seen == set(entities.values()), "every catalogue entity a place needs must be published"


def test_the_published_gazetteer_carries_the_current_communes(published: Path) -> None:
    release = _release(published)
    geography_set = json.loads(
        (published / release["id"] / "catalog/geographies/lu-communes.json").read_text(
            encoding="utf-8"
        )
    )

    assert geography_set["valid_from"] == "2023-09-01"
    assert len(geography_set["members"]) == 100
    by_code = {member["code"]: member for member in geography_set["members"]}
    assert by_code["0304"]["name"] == "Luxembourg"
    assert by_code["0711"]["name"] == "Groussbus-Wal"
    # Retired by the 2023 mergers; they must not be members of the current set.
    for retired in ("0705", "0710", "1201", "1208"):
        assert retired not in by_code


def test_national_figures_are_not_filed_under_an_invented_place(published: Path) -> None:
    release = _release(published)
    paths = [output["path"] for output in release["outputs"]]

    assert "national.json" in paths
    assert not any(path.startswith("places/lu.json") for path in paths)

    national = json.loads((published / release["id"] / "national.json").read_text(encoding="utf-8"))
    assert all(observation["geo_id"] is None for observation in national)


def test_every_observation_is_stamped_with_the_release_that_produced_it(
    published: Path,
) -> None:
    release = _release(published)
    place = json.loads(
        (published / release["id"] / "places/lu.commune.0304.json").read_text(encoding="utf-8")
    )

    assert place
    assert all(observation["release_id"] == release["id"] for observation in place)


def test_publish_refuses_a_connector_that_has_no_place_dataset(tmp_path: Path) -> None:
    assert main(["publish", "example-local", "--out", str(tmp_path)]) == 1


def test_publish_rejects_a_period_filter_that_selects_nothing(tmp_path: Path) -> None:
    assert main(["publish", "statec-lustat", "--out", str(tmp_path), "--since", "9999"]) == 1
    assert not (tmp_path / "latest.json").exists()


# --- The snapshot committed for local development ---------------------------


def test_the_committed_dev_snapshot_is_internally_consistent() -> None:
    """Guards a hand-edited artifact, which no other check would notice."""
    release = _release(DEV_SNAPSHOT)
    base = DEV_SNAPSHOT / release["id"]

    validate_entity("release", release)
    for output in release["outputs"]:
        body = (base / output["path"]).read_bytes()
        assert hashlib.sha256(body).hexdigest() == output["sha256"], output["path"]

    # It must describe the fixture that is actually committed, or the snapshot
    # and the connector have drifted apart.
    fixture = (fixtures_dir() / "statec-lustat" / "population-by-commune.csv").read_bytes()
    assert release["inputs"][0]["sha256"] == hashlib.sha256(fixture).hexdigest()


def test_the_committed_dev_snapshot_covers_every_commune() -> None:
    release = _release(DEV_SNAPSHOT)
    places = [o["path"] for o in release["outputs"] if o["path"].startswith("places/")]

    assert len(places) == 100, "every commune must resolve, or 'no data' becomes misleading"
