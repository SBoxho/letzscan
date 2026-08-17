"""Validation against the generated canonical JSON Schemas."""

from __future__ import annotations

import json
from functools import cache
from typing import Any

from jsonschema import Draft202012Validator

from letzscan.paths import schemas_dir

#: Entity names, matching ``schemas/<name>.schema.json`` and the TypeScript registry.
CANONICAL_ENTITIES: tuple[str, ...] = (
    "source",
    "dataset",
    "indicator",
    "geography",
    "geography-set",
    "observation",
    "live-feature",
    "release",
)


class SchemaValidationError(ValueError):
    """Raised when a payload does not satisfy its canonical contract."""

    def __init__(self, entity: str, errors: list[str]) -> None:
        self.entity = entity
        self.errors = errors
        joined = "\n  ".join(errors)
        super().__init__(f"{entity} does not match its canonical contract:\n  {joined}")


@cache
def load_schema(entity: str) -> dict[str, Any]:
    if entity not in CANONICAL_ENTITIES:
        msg = f"Unknown canonical entity {entity!r}. Known: {', '.join(CANONICAL_ENTITIES)}"
        raise KeyError(msg)
    path = schemas_dir() / f"{entity}.schema.json"
    if not path.is_file():
        msg = f"Missing {path}. Regenerate with: npm run schemas:build"
        raise FileNotFoundError(msg)
    with path.open(encoding="utf-8") as handle:
        data: dict[str, Any] = json.load(handle)
    return data


@cache
def _validator(entity: str) -> Draft202012Validator:
    return Draft202012Validator(load_schema(entity))


def iter_errors(entity: str, payload: Any) -> list[str]:
    """Return human-readable validation errors, empty when the payload is valid."""
    problems = []
    for error in sorted(_validator(entity).iter_errors(payload), key=lambda e: list(e.path)):
        location = "/".join(str(part) for part in error.path) or "<root>"
        problems.append(f"{location}: {error.message}")
    return problems


def validate_entity(entity: str, payload: Any) -> None:
    """Raise :class:`SchemaValidationError` when ``payload`` violates the contract."""
    errors = iter_errors(entity, payload)
    if errors:
        raise SchemaValidationError(entity, errors)
