"""One module per upstream source.

Registration is explicit: a connector that is not in ``CONNECTORS`` does not
exist as far as the catalogue validator is concerned, and an *active* source
whose connector is missing fails validation.
"""

from letzscan.connectors.base import Connector, ConnectorResult, Provenance
from letzscan.connectors.example_local import ExampleLocalConnector
from letzscan.connectors.statec_lustat import StatecLustatConnector

#: Connector id -> implementation.
CONNECTORS: dict[str, Connector] = {
    connector.id: connector
    for connector in (
        # Template only. It reads a synthetic fixture and publishes nothing.
        ExampleLocalConnector(),
        # STATEC LUSTAT DF_X021: total population by commune.
        StatecLustatConnector(),
    )
}

__all__ = [
    "CONNECTORS",
    "Connector",
    "ConnectorResult",
    "Provenance",
]
