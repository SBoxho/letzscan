# Contributing to LëtzScan

Thank you for considering it. This project is a public-data service, so
correctness and provenance matter more than velocity.

## Setup

Node ≥ 22.12, Python ≥ 3.12, and [uv](https://docs.astral.sh/uv/).

```bash
npm install
uv sync --directory pipeline
npm run verify
```

`npm run verify` runs everything CI runs. If it passes locally, CI should pass.

## The architectural boundaries

Three rules carry most of the design. Breaking one is the main thing review
looks for.

**1. Provider code stops at the connector.** A connector is the only place that
may know a provider's field names, encoding, projection, date order or
suppression markers. Everything downstream speaks canonical contracts. There is
a test for this — copy it.

**2. Metadata is data.** Licences, attribution, cadence and source URLs live in
`catalog/`, never in application code.

**3. State has one owner each.** URL state → TanStack Router. Remote data →
TanStack Query. Transient interaction → Zustand. Nothing fetched goes in a
store; anything a user would share goes in the URL.

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/adr/`](docs/adr/README.md).

## Adding a data source

The most common contribution, and deliberately mechanical:

1. **Catalogue it.** `catalog/sources/<id>.yaml`, `status: draft`. Read the
   distribution's own terms and record `licence` and `terms_checked_at`
   honestly. If the terms are unclear, say so in `notes` and stop there — an
   unclear licence is a blocker, not a detail.
2. **Add the indicators** it carries to `catalog/indicators/`, with definitions
   precise enough that two people compute the same number.
3. **Write the connector** in `pipeline/src/letzscan/connectors/<id>.py`,
   implementing `Connector`. Copy `example_local.py`.
4. **Record a fixture** in `fixtures/<id>/`: smallest useful sample, no
   credentials, no copyrighted bodies.
5. **Test it**, including that no provider field name survives the boundary —
   see `pipeline/tests/test_connectors.py`.
6. **Register it** in `pipeline/src/letzscan/connectors/__init__.py`.
7. **Flip to `status: active`** once it actually publishes.
   `npm run catalog:validate` fails if an active source has no connector.

## Changing a canonical contract

Contracts live in `packages/contracts/src`. After editing:

```bash
npm run schemas:build   # regenerate schemas/
npm run verify
```

Commit the regenerated `schemas/` files. CI fails if they are stale, because
that means TypeScript and Python have drifted.

Contracts are deliberately small. Adding a field is cheap; removing one that
turned out to be wrong is not. Add fields when a real dataset needs them, not
in anticipation.

## Data-quality rules that are not negotiable

- **Missing is missing.** `suppressed` and `missing` are distinct and neither is
  ever zero.
- **Three timestamps.** `observed_at`, `published_at`, `fetched_at` — never
  conflated.
- **Never overwrite good data with empty data** unless the source genuinely
  represents an empty state.
- **Do not invent precision.** No geometry the source does not have, no
  confidence a method does not support.
- **Do not call something live** unless a scheduled job actually refreshed it.

## Secrets

Never commit one. `.dev.vars` and `.env*` are gitignored, `npm run check:secrets`
scans the working tree, and the web build refuses to inline a `VITE_` variable
whose name looks like a credential. If a credential is needed, it belongs in a
Worker secret and the call gets proxied. See [`SECURITY.md`](SECURITY.md).

## Pull requests

- One concern per PR.
- Tests for behaviour, especially anything that parses upstream data.
- Say what you verified, and what you did not.
- New source? Include the licence and where you read it.
- `npm run verify` passes.

## Notebooks

Exploratory only, outputs stripped, under `notebooks/exploration/`. If a
notebook computes something the site publishes, that logic belongs in the
pipeline with tests.
