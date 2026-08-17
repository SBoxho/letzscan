# LëtzScan

Open-source platform for exploring Luxembourg public data: current conditions,
places, comparisons and the sources behind every number.

LëtzScan is **area-first**. The primary object is a place, or right now — not a
dataset and not a map layer. Ask "what is it like in this commune?" and get an
answer with a source, a licence and an observation date attached.

## Status: v2 rebuild, foundations only

This repository is a greenfield rebuild. **No dataset has been migrated yet and
nothing is deployed.** What exists today is the structure the rest will be built
on, in vertical slices:

- product shell with every surface routed and URL-addressable;
- Cloudflare Worker with a health endpoint, a cron entry point and R2 bindings;
- Python pipeline with a reference connector, contracts, tests and linting;
- canonical data contracts shared by TypeScript and Python;
- reviewed source catalogue with validation in CI.

The next slice is an official population-by-commune dataset feeding
`/places/:geoId`.

The predecessor's honest failure modes — stale data behind a surface called
"Live", a pipeline nobody but the author could run, no licence, no CI — are what
this structure is shaped to prevent.

## Repository structure

```
apps/
  web/                 React + TypeScript + Vite application
  edge/                Cloudflare Worker: API, cron ingestion, R2, all secrets
packages/
  contracts/           Zod canonical contracts — the single source of truth
pipeline/              Python (uv): connectors, normalise, derive, publish
catalog/               Reviewed source, indicator and geography metadata as data
  sources/  indicators/  geographies/
schemas/               JSON Schema generated from packages/contracts (do not edit)
fixtures/              Small recorded provider payloads for offline tests
notebooks/exploration/ Research only, never production lineage
docs/                  architecture.md and ADRs
```

Where things belong:

| I want to…                            | Go to                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Add a provider integration            | `pipeline/src/letzscan/connectors/` (batch) or `apps/edge/src/` (live) |
| Change a canonical shape              | `packages/contracts/src/`, then `npm run schemas:build`                |
| Record a source, licence or indicator | `catalog/`                                                             |
| Add a product surface                 | `apps/web/src/features/` + `apps/web/src/app/routeTree.tsx`            |
| Understand a decision                 | `docs/adr/`                                                            |

## Local development

Requirements: **Node ≥ 24** (LTS), **Python ≥ 3.12**, and
[**uv**](https://docs.astral.sh/uv/getting-started/installation/).

```bash
git clone <repo> && cd letzscan
npm install
uv sync --directory pipeline
```

`npm install` also builds `packages/contracts`, so the app runs immediately.

### Run the web app

```bash
npm run dev
```

http://localhost:5173 — every surface renders with placeholders.

### Run the Worker

```bash
npm run dev:edge
```

http://127.0.0.1:8787/api/health returns the health contract. With both running,
`/status` in the web app shows the live result; with only the web app running it
shows the degraded state, which is the intended behaviour.

For local Worker secrets, copy `apps/edge/.dev.vars.example` to
`apps/edge/.dev.vars`. That file is gitignored and must stay that way.

### Run the pipeline

```bash
npm run py:test                                        # pytest
npm run catalog:validate                               # catalogue vs schemas
uv run --directory pipeline letzscan list-connectors
uv run --directory pipeline letzscan run example-local --out .out
```

The last command runs the reference connector against a synthetic fixture and
writes a draft release — the whole path from provider payload to validated
canonical artifact, offline.

### Run everything CI runs

```bash
npm run verify
```

Which is: credential hygiene → format → lint → typecheck → generated schemas are
current → TypeScript tests → build → Ruff → pytest → catalogue validation.
`npm run verify:js` and `npm run verify:py` run the halves separately.

## Architecture at a glance

Three runtimes, each with one reason to exist:

| Runtime                     | Owns                                                   |
| --------------------------- | ------------------------------------------------------ |
| **Python + GitHub Actions** | Heavy statistical and geospatial batch work            |
| **Cloudflare Worker**       | Live feeds on cron, a small read API, every credential |
| **Browser**                 | Rendering. It never calls a provider.                  |

Static artifacts are the product: every user-facing read is a CDN-cached file,
and compute happens on a schedule, never inside a user's request. There is no
database and no general backend.

The rule the whole repository is arranged around:

> **Provider-specific schemas are transformed at the connector boundary.
> Product code consumes canonical LëtzScan contracts.**

Zod defines those contracts once; the JSON Schemas are generated from it and
Python validates against them, so the two languages cannot drift.

Full detail: [`docs/architecture.md`](docs/architecture.md) ·
decisions: [`docs/adr/`](docs/adr/README.md).

## Licensing

**Code is Apache-2.0** (see [`LICENSE`](LICENSE)).

**Upstream data is not.** Each dataset keeps the licence its producer published
it under, and those terms travel with it — including attribution requirements
and, for some sources, limits on redistribution. Nothing in this repository's
code licence grants rights over anyone's data. See
[`DATA_LICENSES.md`](DATA_LICENSES.md).

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) · [`SECURITY.md`](SECURITY.md)
