# 5. Static-first, and no database

Date: 2026-08-17
Status: Accepted

## Context

The obvious instinct for "a data platform" is a database and an API server. Both
architecture reviews independently concluded that this workload does not need
either, and that adding one would convert a durable, near-free project into an
operational commitment that outlives nobody's attention.

Comparable civic-data projects that died were the ones with infrastructure to
keep alive. The ones that survived were small, static and single-purpose.

## Decision

**Every user-facing read is a CDN-cached static file. Compute happens on a
schedule, never inside a user's request.**

- No PostgreSQL, Supabase, D1 or KV for public read-only data.
- No general-purpose backend and no pass-through proxy route.
- No queue, no orchestrator, no Kubernetes.
- The Worker exists for three things only: a small normalized read API,
  scheduled ingestion, and holding credentials.

Storage is R2 with three tiers (`raw/`, `normalized/`, `published/`) and an
atomic `latest` pointer.

State is introduced only when a feature genuinely requires it, and each such
introduction is a new ADR. The bar: name the user-facing feature, show why a
scheduled job plus a static artifact cannot serve it.

Luxembourg's scale makes this comfortable rather than clever. Roughly 100
communes across a few dozen indicators and twenty years is a few megabytes of
Parquet — the entire historical national dataset fits in the space most
applications spend on a JavaScript framework.

## Consequences

- Traffic changes latency, not cost or architecture.
- There is nothing to patch, back up, or discover expired after six months of
  inattention.
- Any query pattern that genuinely needs an index — arbitrary SQL over history,
  say — has to be argued for explicitly, and will most likely be served by a
  precomputed artifact instead.
- A request-time proxy is allowed only where the key space is unbounded and
  cannot be pre-generated (a departure board for an arbitrary stop, for
  example). Such routes are bounded, validated, cached and rate-limited.
