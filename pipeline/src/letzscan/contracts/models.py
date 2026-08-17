"""Pydantic models for the canonical entities the pipeline constructs.

Only the entities the pipeline actually emits are modelled here. The catalogue
entities (source, indicator, geography set) are authored as YAML and validated
against the generated JSON Schemas directly — a second hand-written definition
of them would be a second thing to keep in sync.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

#: Keys where ``None`` is a fact rather than an absence, and must therefore be
#: serialised as an explicit null:
#:
#:   geo_id    null means "national", not "we forgot the geography"
#:   value     null means suppressed or missing, and must never become 0
#:   geometry  null means the provider gave no usable location; we do not invent one
#:
#: Every other optional field is simply omitted when unset, which keeps the
#: published artifacts small and their meaning unambiguous.
MEANINGFUL_NULLS: frozenset[str] = frozenset({"geo_id", "value", "geometry"})


def _prune(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _prune(item)
            for key, item in value.items()
            if item is not None or key in MEANINGFUL_NULLS
        }
    if isinstance(value, list):
        return [_prune(item) for item in value]
    return value


class ObservationStatus(StrEnum):
    """``suppressed`` and ``missing`` are different facts; neither is ever zero."""

    OBSERVED = "observed"
    PROVISIONAL = "provisional"
    REVISED = "revised"
    ESTIMATED = "estimated"
    SUPPRESSED = "suppressed"
    MISSING = "missing"


class CanonicalModel(BaseModel):
    """Base: reject unknown keys, so a provider field can never sneak through."""

    model_config = ConfigDict(extra="forbid", frozen=True, use_enum_values=True)

    def to_payload(self) -> dict[str, Any]:
        """JSON-ready dict matching the generated schema.

        Unset optional fields are omitted, at every nesting level; meaningful
        nulls (see :data:`MEANINGFUL_NULLS`) are preserved.
        """
        pruned: dict[str, Any] = _prune(self.model_dump(mode="json"))
        return pruned


class Observation(CanonicalModel):
    """One indicator value, for one geography, for one period."""

    indicator_id: str
    geo_id: str | None = Field(description="None for a national figure.")
    period: str
    value: float | str | None
    unit: str
    status: ObservationStatus
    dataset_id: str
    source_id: str
    release_id: str | None = None

    @model_validator(mode="after")
    def _missing_values_stay_missing(self) -> Observation:
        if self.status in {ObservationStatus.SUPPRESSED, ObservationStatus.MISSING}:
            if self.value is not None:
                msg = "Suppressed and missing observations must carry a null value."
                raise ValueError(msg)
        return self


class ReleaseInput(CanonicalModel):
    source_id: str
    dataset_id: str | None = None
    url: str | None = None
    fetched_at: str
    sha256: str
    bytes: int | None = None


class ReleaseOutput(CanonicalModel):
    path: str
    sha256: str
    bytes: int
    content_type: str | None = None


class Release(CanonicalModel):
    """An immutable publication unit."""

    id: str
    created_at: str
    pipeline_version: str
    status: Literal["draft", "published", "failed"]
    inputs: list[ReleaseInput] = Field(default_factory=list)
    outputs: list[ReleaseOutput] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
