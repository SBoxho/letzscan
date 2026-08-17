"""The generated schemas are the shared truth. These tests keep Python honest."""

from __future__ import annotations

import pytest
from jsonschema import Draft202012Validator

from letzscan.contracts import CANONICAL_ENTITIES, SchemaValidationError, validate_entity
from letzscan.contracts.models import Observation, ObservationStatus
from letzscan.contracts.schemas import load_schema


@pytest.mark.parametrize("entity", CANONICAL_ENTITIES)
def test_every_canonical_schema_is_a_valid_json_schema(entity: str) -> None:
    schema = load_schema(entity)
    Draft202012Validator.check_schema(schema)
    assert schema["$id"].endswith(f"{entity}.schema.json")


def test_unknown_entity_is_rejected_rather_than_guessed() -> None:
    with pytest.raises(KeyError):
        load_schema("vibes")


def _observation(**overrides: object) -> Observation:
    payload = {
        "indicator_id": "population.total",
        "geo_id": "lu.commune.0304",
        "period": "2025",
        "value": 12345.0,
        "unit": "person",
        "status": ObservationStatus.OBSERVED,
        "dataset_id": "example-local.population-by-commune",
        "source_id": "example-local",
    }
    payload.update(overrides)
    return Observation(**payload)  # type: ignore[arg-type]


def test_pydantic_model_output_satisfies_the_generated_schema() -> None:
    validate_entity("observation", _observation().to_payload())


def test_national_observation_has_a_null_geography_not_a_fake_one() -> None:
    payload = _observation(geo_id=None).to_payload()
    assert payload["geo_id"] is None
    validate_entity("observation", payload)


def test_suppressed_value_cannot_be_a_number() -> None:
    with pytest.raises(ValueError, match="null value"):
        _observation(status=ObservationStatus.SUPPRESSED, value=0)


def test_provider_fields_cannot_ride_along_on_a_canonical_record() -> None:
    with pytest.raises(ValueError, match="POP_TOTALE"):
        _observation(POP_TOTALE="12 345")


def test_schema_violation_is_reported_with_a_location() -> None:
    broken = _observation().to_payload()
    broken["status"] = "probably-fine"
    with pytest.raises(SchemaValidationError) as excinfo:
        validate_entity("observation", broken)
    assert "status" in str(excinfo.value)
