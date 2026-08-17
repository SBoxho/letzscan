"""Canonical contracts, as seen from Python.

The Zod definitions in ``packages/contracts`` are the single source of truth.
They generate ``schemas/*.schema.json``; this package validates against those
files rather than restating them, so the two runtimes cannot drift.

``models`` holds Pydantic models for the entities the pipeline *constructs*.
Their conformance to the generated schemas is asserted in the test suite.
"""

from letzscan.contracts.models import Observation, ObservationStatus, Release, ReleaseOutput
from letzscan.contracts.schemas import (
    CANONICAL_ENTITIES,
    SchemaValidationError,
    load_schema,
    validate_entity,
)

__all__ = [
    "CANONICAL_ENTITIES",
    "Observation",
    "ObservationStatus",
    "Release",
    "ReleaseOutput",
    "SchemaValidationError",
    "load_schema",
    "validate_entity",
]
