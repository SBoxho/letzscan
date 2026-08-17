"""Locating repository-level assets shared by both languages.

``schemas/`` and ``catalog/`` are repository-level, not pipeline-level: the
TypeScript contracts generate the first, and both runtimes read the second.
"""

from __future__ import annotations

import os
from pathlib import Path

_MARKERS = ("schemas", "catalog")


def _looks_like_repo_root(candidate: Path) -> bool:
    return all((candidate / marker).is_dir() for marker in _MARKERS)


def repo_root() -> Path:
    """Return the repository root.

    Honours ``LETZSCAN_REPO_ROOT`` so that the pipeline can run against a
    checkout from anywhere (CI, a notebook, a scheduled job).
    """
    override = os.environ.get("LETZSCAN_REPO_ROOT")
    if override:
        root = Path(override).resolve()
        if not _looks_like_repo_root(root):
            msg = f"LETZSCAN_REPO_ROOT={root} does not contain schemas/ and catalog/"
            raise RuntimeError(msg)
        return root

    for start in (Path(__file__).resolve(), Path.cwd().resolve()):
        for candidate in (start, *start.parents):
            if _looks_like_repo_root(candidate):
                return candidate

    msg = (
        "Could not locate the repository root (a directory containing both "
        "schemas/ and catalog/). Set LETZSCAN_REPO_ROOT."
    )
    raise RuntimeError(msg)


def schemas_dir() -> Path:
    return repo_root() / "schemas"


def catalog_dir() -> Path:
    return repo_root() / "catalog"


def fixtures_dir() -> Path:
    return repo_root() / "fixtures"
