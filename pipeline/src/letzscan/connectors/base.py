"""The connector boundary.

A connector is the ONLY place that is allowed to know what an upstream provider
calls its fields, which encoding it uses, which projection its coordinates are
in, or how it marks a suppressed value.

It returns canonical records plus the provenance needed to reproduce them.
Everything downstream is provider-agnostic by construction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Protocol

from letzscan.contracts.models import Observation


@dataclass(frozen=True, slots=True)
class Provenance:
    """Where a batch of records came from.

    ``fetched_at`` is when LëtzScan received the payload. It is deliberately
    separate from the observation period and from any provider publication time:
    conflating them is the most common data-health bug in this class of system.
    """

    source_id: str
    fetched_at: datetime
    #: Location the payload was read from: a URL, or a fixture path in tests.
    location: str
    #: SHA-256 of the raw payload, so a release can be re-derived.
    sha256: str

    def __post_init__(self) -> None:
        if self.fetched_at.tzinfo is None:
            msg = "fetched_at must be timezone-aware; store UTC."
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class ConnectorResult:
    """What every connector returns, regardless of what it talked to."""

    provenance: Provenance
    observations: list[Observation] = field(default_factory=list)
    #: Non-fatal problems worth surfacing on /status rather than swallowing.
    warnings: list[str] = field(default_factory=list)


class Connector(Protocol):
    """Narrow interface every source implements."""

    #: Matches ``connector:`` in the source's catalogue entry.
    id: str

    def fetch(self) -> ConnectorResult:
        """Retrieve the upstream payload and return canonical records."""
        ...


def utc_now() -> datetime:
    return datetime.now(tz=UTC)
