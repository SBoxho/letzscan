"""LëtzScan data pipeline.

The invariant this package exists to protect:

    Provider-specific schemas are transformed at the connector boundary.
    Everything downstream — derivations, geography, publication, and every
    consumer of the published artifacts — speaks canonical LëtzScan contracts.

See ``docs/adr/0002-canonical-contracts-and-connector-boundary.md``.
"""

__version__ = "0.1.0"
