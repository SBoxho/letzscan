# 2. Canonical contracts and the connector boundary

Date: 2026-08-17
Status: Accepted

## Context

In the previous implementation, source metadata, TypeScript interfaces, sector
configuration, panel registrations, freshness rules and Python writers each
described overlapping facts by hand. Licence strings were copied into React
components. Every sector re-derived its own value shape. The result was that a
provider changing a field name could blank a panel three months later, silently.

## Decision

### One rule

> **Provider-specific schemas are transformed at the connector boundary.
> Product code consumes canonical LëtzScan contracts.**

A connector is the only code allowed to know a provider's field names,
encoding, projection, date order or suppression markers. It returns canonical
records plus provenance. Everything downstream is provider-agnostic.

### Seven canonical entities

| Entity        | Answers                                                    |
| ------------- | ---------------------------------------------------------- |
| `Source`      | Who publishes this, under what licence, checked when?      |
| `Dataset`     | Which normalised, citable collection is this?              |
| `Indicator`   | What exactly is being measured, in what unit?              |
| `Geography`   | Which place, in which boundary version?                    |
| `Observation` | One indicator, one place, one period, one value.           |
| `LiveFeature` | One current-conditions record with three timestamps.       |
| `Release`     | One immutable publication with input and output checksums. |

Plus `GeographySet`, the versioned container that declares a family of
geographies and its crosswalk lineage, and the API response contracts in
`packages/contracts/src/api.ts` for LëtzScan's own HTTP surface.

The fields are deliberately few. Adding one is cheap; removing one that turned
out to be wrong is not. They will grow as real datasets demand it.

### One definition, two languages

Zod, in `packages/contracts`, is the single source of truth. It generates
`schemas/*.schema.json`, which Python validates against. Neither language
restates the other's model, and `npm run schemas:check` fails CI when the
generated files are stale.

The generated schemas use **input** semantics: a field with a declared default
is optional and carries its default, so hand-authored catalogue files do not
have to restate defaults. Unknown keys are rejected in both directions — which
is precisely what stops a provider field name riding along on a canonical
record.

### Metadata is data

`catalog/` holds one reviewed file per source, indicator and geography set.
Licences, attribution, cadence and `terms_checked_at` live there and reach the
UI as data. A licence string in a React component is a bug.

`letzscan validate-catalog` enforces schema conformance, that a file name equals
its `id`, that cross-references resolve, and that an **active** source has a
connector that actually exists in code.

### Invariants encoded, not remembered

- `suppressed` and `missing` are distinct statuses; both carry a null value and
  neither is ever coerced to zero.
- `geo_id: null` means national — an explicit null, never an omitted key.
- `observed_at`, `published_at` and `fetched_at` are separate fields.
- Timestamps require an explicit UTC offset.
- Every source records `terms_checked_at` and an attribution string, including
  for public-domain licences.

## Consequences

- Adding a source is mechanical: a catalogue YAML, a connector module, a
  fixture, a test. That is a reviewable contribution, which matters for a
  project that wants outside contributors.
- A provider shape change fails a build rather than blanking a panel.
- Changing a canonical contract is a deliberate, visible act: it regenerates
  schemas and can break both languages at once — which is the point.
