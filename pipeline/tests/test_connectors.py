"""What every connector test should assert.

The important one is `test_no_provider_field_names_survive_the_boundary`. Copy
it when adding a real source.
"""

from __future__ import annotations

import json

from letzscan.connectors import CONNECTORS
from letzscan.connectors.example_local import ExampleLocalConnector
from letzscan.contracts import validate_entity
from letzscan.contracts.models import ObservationStatus


def test_connector_registry_is_keyed_by_declared_id() -> None:
    for connector_id, connector in CONNECTORS.items():
        assert connector.id == connector_id


def test_example_connector_emits_canonical_observations() -> None:
    result = ExampleLocalConnector().fetch()

    assert len(result.observations) == 3
    for observation in result.observations:
        validate_entity("observation", observation.to_payload())


def test_thousands_separators_are_parsed_not_truncated() -> None:
    result = ExampleLocalConnector().fetch()
    by_geo = {o.geo_id: o for o in result.observations}

    assert by_geo["lu.commune.0304"].value == 12345.0
    assert by_geo["lu.commune.0311"].value == 1204.0


def test_withheld_value_is_suppressed_and_reported_not_silently_dropped() -> None:
    result = ExampleLocalConnector().fetch()
    withheld = next(o for o in result.observations if o.geo_id == "lu.commune.0399")

    assert withheld.value is None
    assert withheld.status == ObservationStatus.SUPPRESSED
    assert any("0399" in warning for warning in result.warnings)


def test_no_provider_field_names_survive_the_boundary() -> None:
    result = ExampleLocalConnector().fetch()
    serialised = json.dumps([o.to_payload() for o in result.observations])

    for provider_field in ("CODE_COMMUNE", "LIB_COMMUNE", "POP_TOTALE", "ANNEE", "personnes"):
        assert provider_field not in serialised


def test_provenance_records_a_timezone_aware_fetch_time_and_a_checksum() -> None:
    provenance = ExampleLocalConnector().fetch().provenance

    assert provenance.fetched_at.tzinfo is not None
    assert len(provenance.sha256) == 64
    assert provenance.source_id == "example-local"
