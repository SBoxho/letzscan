"""Reference connector — a template, not a real source.

It reads a synthetic fixture whose shape is deliberately unpleasant in the ways
real Luxembourg distributions are: French field names, a thousands separator
inside a quoted string, a day-first date, and ``":"`` for a suppressed value.

Copy this file when adding a real source. Note what it does *not* do: nothing
below this module ever sees ``CODE_COMMUNE`` or ``POP_TOTALE``.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from letzscan.connectors.base import ConnectorResult, Provenance, utc_now
from letzscan.contracts.models import Observation, ObservationStatus
from letzscan.normalize import parse_number, parse_year
from letzscan.paths import fixtures_dir

SOURCE_ID = "example-local"
DATASET_ID = "example-local.population-by-commune"
INDICATOR_ID = "population.total"


class ExampleLocalConnector:
    id = "example-local"

    def __init__(self, fixture: Path | None = None) -> None:
        self._fixture = fixture or fixtures_dir() / "example-local" / "population-sample.json"

    def fetch(self) -> ConnectorResult:
        raw_bytes = self._fixture.read_bytes()
        payload: dict[str, Any] = json.loads(raw_bytes.decode("utf-8"))

        provenance = Provenance(
            source_id=SOURCE_ID,
            fetched_at=utc_now(),
            location=str(self._fixture),
            sha256=hashlib.sha256(raw_bytes).hexdigest(),
        )

        unit = payload["meta"]["unite"]
        observations: list[Observation] = []
        warnings: list[str] = []

        for row in payload["donnees"]:
            value = parse_number(row["POP_TOTALE"])
            status = (
                ObservationStatus.OBSERVED if value is not None else ObservationStatus.SUPPRESSED
            )
            if value is None:
                warnings.append(
                    f"{row['CODE_COMMUNE']} {row['ANNEE']}: value withheld upstream, "
                    "recorded as suppressed rather than zero."
                )

            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    geo_id=f"lu.commune.{row['CODE_COMMUNE']}",
                    period=parse_year(row["ANNEE"]),
                    value=value,
                    unit="person" if unit == "personnes" else unit,
                    status=status,
                    dataset_id=DATASET_ID,
                    source_id=SOURCE_ID,
                )
            )

        return ConnectorResult(provenance=provenance, observations=observations, warnings=warnings)
