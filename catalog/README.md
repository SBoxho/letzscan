# Catalogue

The reviewed description of everything LëtzScan ingests. One file per thing,
validated in CI against the canonical schemas in `../schemas/`.

```
sources/       one reviewed upstream distribution per file
indicators/    stable measure definitions
geographies/   versioned geography sets and their lineage
datasets/      published datasets (added with the first vertical slice)
```

## Rules

- **The distribution wins.** Licence and attribution are recorded for the exact
  distribution being used, never inferred from the portal it sits on.
- **`terms_checked_at` is a fact, not a formality.** It records when a
  maintainer last read the upstream terms. An overdue date is a task.
- **A source starts as `draft`.** It becomes `active` only when a connector
  exists and it actually publishes. `disabled` requires a `status_reason`, so a
  dark feed is self-documenting.
- **File name equals `id`.** Validation enforces it.
- **Nothing here is retyped into application code.** Source metadata, licences
  and attribution reach the UI as data. A licence string in a React component is
  a bug.

## Checking your changes

```bash
npm run catalog:validate
```

An `active` source whose `connector` is not registered in
`pipeline/src/letzscan/connectors` fails validation — that is the coupling
between the catalogue and the connector boundary, made mechanical.
