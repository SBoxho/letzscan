"""Release assembly.

Publication is atomic by construction: artifacts are written under an immutable
release id, and only after validation does a ``latest`` pointer advance. A
failed build therefore cannot change what users see.

The R2 layout this targets (see docs/architecture.md):

    raw/{source_id}/{yyyy}/{mm}/{dd}/{fetched_at}-{sha256}.{ext}
    normalized/{dataset_id}/{release_id}/...
    published/{release_id}/...
    published/latest.json
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from letzscan import __version__
from letzscan.connectors.base import ConnectorResult
from letzscan.contracts.models import Release, ReleaseInput, ReleaseOutput
from letzscan.contracts.schemas import validate_entity


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def build_release(
    release_id: str,
    created_at: str,
    results: list[ConnectorResult],
    outputs: list[ReleaseOutput] | None = None,
) -> Release:
    """Assemble a release manifest from connector results.

    Warnings are carried, not swallowed: a partially degraded build must be
    visible on /status rather than indistinguishable from a clean one.
    """
    return Release(
        id=release_id,
        created_at=created_at,
        pipeline_version=__version__,
        status="draft",
        inputs=[
            ReleaseInput(
                source_id=result.provenance.source_id,
                fetched_at=result.provenance.fetched_at.isoformat().replace("+00:00", "Z"),
                sha256=result.provenance.sha256,
            )
            for result in results
        ],
        outputs=outputs or [],
        warnings=[warning for result in results for warning in result.warnings],
    )


def write_release(release: Release, destination: Path) -> Path:
    """Validate against the canonical contract, then write the manifest.

    Validation happens before the write so an invalid manifest never reaches
    disk, let alone object storage.
    """
    payload = release.to_payload()
    validate_entity("release", payload)

    destination.mkdir(parents=True, exist_ok=True)
    path = destination / "release.json"
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path
