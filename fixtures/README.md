# Fixtures

Small, recorded upstream payloads, one directory per source id. They make
connector tests run offline, deterministically, and without hitting a provider.

## Rules

- **Smallest useful sample.** A handful of rows, trimmed to the fields the
  connector reads.
- **Legally safe.** Never a copyrighted article body. Never personal data. For
  restrictively licensed sources, record the _shape_ rather than the content.
- **Never a credential.** Strip keys, tokens and signed URLs before committing.
- **A fixture is a contract test, not a cache.** When an upstream changes shape,
  re-record deliberately and let the diff be reviewed.

## Contents

| Directory        | Source           | Notes                                                            |
| ---------------- | ---------------- | ---------------------------------------------------------------- |
| `example-local/` | none — synthetic | Template payload used by the reference connector. Not real data. |

`example-local/population-sample.json` is deliberately awkward in the ways real
Luxembourg distributions are: provider field names in French, a thousands
separator inside a quoted string, a day-first extraction date, and `":"` for a
value the producer withheld. It exists to show what a connector must absorb so
that nothing downstream has to.
