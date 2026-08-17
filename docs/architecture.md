# LëtzScan architecture

Status: **initialised, no dataset migrated yet.** This document describes the
boundaries established at repository initialisation and the shape the system is
being built toward. Where something does not exist yet, it says so.

## 1. What LëtzScan is

An area-first public information service for Luxembourg open data. The primary
object is **a place** or **right now** — not a dataset and not a map layer.

The product surfaces, each answering one question:

| Surface          | Question                                              |
| ---------------- | ----------------------------------------------------- |
| `/`              | Where do I start?                                     |
| `/now`           | What is happening right now?                          |
| `/places/:geoId` | What is true about this commune?                      |
| `/explore`       | Where is a measure highest or lowest?                 |
| `/compare`       | How do these places compare?                          |
| `/data`          | Where does this number come from, and may I reuse it? |
| `/status`        | Is any of this current?                               |

## 2. Runtime split

There are exactly three runtimes, and each has one reason to exist.

```
                       upstream sources (official Luxembourg distributions)
                                  │
              ┌───────────────────┴────────────────────┐
              │                                        │
   GitHub Actions + Python (uv)            Cloudflare Worker (cron)
   heavy / statistical / geospatial        small, frequent, I/O-bound
   batch: pull, normalise, derive,         live feeds, secret-bearing calls
   validate, publish a release             normalise -> R2 artifacts
              │                                        │
              └───────────────┬────────────────────────┘
                              ▼
                      Cloudflare R2
              raw/  normalized/  published/
                              │
                      CDN (cache rules)
                              │
                              ▼
                    Browser: React + Vite
        reads published artifacts and a small edge API only
```

**Static artifacts are the product.** Every user-facing read is a CDN-cached
file. Compute happens on a schedule, never inside a user's request.

**The browser never talks to a provider.** It knows two origins: published
artifacts and the LëtzScan edge API. That is what makes "no credential can reach
the browser" a structural property rather than a discipline.

**No general backend, no database.** There is no user account, no write path and
no personalisation that cannot live in the URL or in `localStorage`. Postgres,
Supabase, Kubernetes, Kafka and Airflow are all out of scope; if a feature ever
needs one, that is an ADR, not a default.

## 3. The connector boundary

This is the most important rule in the repository.

> **Provider-specific schemas are transformed at the connector boundary.
> Product code consumes canonical LëtzScan contracts.**

A connector — `pipeline/src/letzscan/connectors/<id>.py`, or a Worker module for
live feeds — is the only place allowed to know:

- what the provider calls its fields;
- which encoding, projection and date order it uses;
- how it marks a suppressed value;
- which quirks that particular distribution has.

It returns canonical records plus provenance. Nothing downstream — derivations,
geography, publication, the Worker API, React components — may see a provider
field name. `pipeline/tests/test_connectors.py` asserts this directly; copy that
test when adding a source.

Canonical entities: `Source`, `Dataset`, `Indicator`, `Geography`,
`Observation`, `LiveFeature`, `Release`.
See [ADR 0002](adr/0002-canonical-contracts-and-connector-boundary.md).

## 4. Where things live

```
apps/web/        React + Vite application. Renders canonical contracts.
apps/edge/       Cloudflare Worker: public API, cron ingestion, R2, all secrets.
packages/contracts/  Zod contracts — the single source of truth for shapes.
schemas/         JSON Schema generated from the above. Do not hand-edit.
pipeline/        Python (uv): connectors, normalisation, derivation, publication.
catalog/         Reviewed source, indicator and geography metadata as data.
fixtures/        Small recorded provider payloads for offline connector tests.
notebooks/       Exploratory work. Never production lineage.
docs/adr/        Decisions and their reasons.
```

TypeScript and Python cannot drift because they do not each define the model:
Zod generates the JSON Schemas, and Python validates against those files.
`npm run schemas:check` fails the build if the committed schemas are stale.

## 5. Data plane

Three tiers, all in R2. None of it exists yet; the layout is fixed so the first
connector does not have to invent one.

| Tier       | Path                                                           | Format              | Purpose                                    |
| ---------- | -------------------------------------------------------------- | ------------------- | ------------------------------------------ |
| raw        | `raw/{source_id}/{yyyy}/{mm}/{dd}/{fetched_at}-{sha256}.{ext}` | exactly as fetched  | reproduce and re-parse without re-fetching |
| normalized | `normalized/{dataset_id}/{release_id}/`                        | Parquet             | the long-form fact table                   |
| published  | `published/{release_id}/` + `published/latest.json`            | small JSON, GeoJSON | what the app and the public read           |

**Publication is atomic.** Artifacts are written under an immutable release id;
the `latest` pointer advances only after validation passes, so a failed build
cannot change what users see.

**Three timestamps, always separated:** `observed_at` (when the phenomenon
happened), `published_at` (when the provider released it), `fetched_at` (when we
received it). "We fetched fine two minutes ago" and "upstream has not published
in nine days" are different facts and must render differently.

**Missing is missing.** `suppressed` and `missing` are distinct statuses and
neither is ever coerced to zero. A good artifact is never overwritten by an
empty one unless the source genuinely represents an empty state.

## 6. Frontend

| Concern                                                | Owner                         |
| ------------------------------------------------------ | ----------------------------- |
| URL state — the shareable, restorable view             | TanStack Router               |
| Remote state — artifacts and API reads                 | TanStack Query                |
| Transient client state — hover, selection, open panels | Zustand                       |
| Runtime validation at every network boundary           | Zod                           |
| Map                                                    | MapLibre GL JS, lazily loaded |
| Styling                                                | Tailwind                      |

A copied URL must reconstruct the same view. If a user would send it to a
colleague, it is a search parameter, not store state.
See [ADR 0003](adr/0003-frontend-state-ownership.md).

The map is loaded behind a lazy boundary and currently has **no basemap**: a
basemap is a licensing decision, not a default, and will be chosen deliberately.

## 7. Environments

|            | Local                            | Staging                             | Production                             |
| ---------- | -------------------------------- | ----------------------------------- | -------------------------------------- |
| Web        | `vite` on :5173                  | preview deployment                  | static hosting                         |
| Worker     | `wrangler dev` on :8787, no cron | `--env staging`, cron enabled       | `--env production`, cron enabled       |
| R2 bucket  | `letzscan-data-dev`              | `letzscan-data-staging`             | `letzscan-data`                        |
| Secrets    | `.dev.vars` (gitignored)         | `wrangler secret put --env staging` | `wrangler secret put --env production` |
| Deployment | —                                | manual until the first slice ships  | manual, gated on staging               |

Cron triggers are deliberately absent from the local environment so a laptop
never starts polling providers. See
[ADR 0004](adr/0004-environments-and-deployment.md).

## 8. What is deliberately not here yet

PMTiles, Parquet-in-the-browser, a basemap, analytics, SEO prerendering, i18n,
a chart library, a real connector, a database, a monorepo build framework, and
automatic production deployment. Each is a decision to make when a real feature
needs it, and each will get its own ADR.
