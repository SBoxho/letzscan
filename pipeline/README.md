# LëtzScan pipeline

Heavy, statistical and geospatial processing. Python because the source formats
and geometry operations justify it — not because the web app needs a backend.

```
src/letzscan/
├── connectors/   one module per upstream source. Provider-specific code lives
│                 here and nowhere else.
├── contracts/    canonical entities, validated against ../../schemas/*.json
├── normalize/    provider-shaped values -> canonical values (dates, numbers,
│                 encodings, projections)
├── derive/       canonical -> canonical (rates, rankings, change over time)
├── geography/    gazetteers, boundary versions, crosswalks, simplification
└── publish/      release manifests and atomic publication
```

## Commands

```bash
uv sync                       # create .venv and install (run inside pipeline/)
uv run pytest
uv run ruff check .
uv run ruff format .
uv run letzscan validate-catalog
uv run letzscan list-connectors
uv run letzscan run example-local --out .out
```

From the repository root the same checks are available as
`npm run py:test`, `npm run py:lint` and `npm run catalog:validate`.

## Adding a connector

1. Add the reviewed source to `catalog/sources/<id>.yaml`, `status: draft`.
2. Add `src/letzscan/connectors/<id>.py` implementing `Connector`.
3. Record a small, legally safe fixture under `fixtures/<id>/`.
4. Write a test that asserts the connector emits canonical records and that no
   provider field name survives the boundary.
5. Flip the source to `status: active` once it publishes.

`uv run letzscan validate-catalog` fails if an active source has no connector.
