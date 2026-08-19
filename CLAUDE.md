# LëtzScan — working rules

Luxembourg open-data platform. Area-first: the primary object is a place, or
right now. Every number carries a source, a licence and a date.

## Verify before you commit

```bash
npm run verify
```

Credential scan → format → lint → typecheck → generated schemas current → TS
tests → build → Ruff → pytest → catalogue validation. `main` is protected; work
on a branch and open a PR.

## Three boundaries

**1. Provider code stops at the connector.**
`pipeline/src/letzscan/connectors/<id>.py` is the only place allowed to know a
provider's field names, encoding, projection, date order or suppression markers.
Everything downstream speaks canonical contracts.
`pipeline/tests/test_connectors.py::test_no_provider_field_names_survive_the_boundary`
asserts it — copy that test.

**2. Metadata is data.** Licences, attribution, cadence, `terms_checked_at` and
caveats live in `catalog/` and reach the UI through the published artifacts.
A licence string in a React component is a bug.

**3. State has one owner each.** URL → TanStack Router. Remote → TanStack Query.
Transient interaction → Zustand. Nothing fetched goes in a store; anything a user
would share goes in the URL.

## Rules that are not style preferences

- **Never invent data.** No hand-written fixture that looks real, no guessed
  code, no approximated figure. If upstream is unreachable or surprising, stop
  and report.
- **Missing is missing.** `suppressed` and `missing` are distinct, both null,
  neither ever `0`. `geo_id: null` means national.
- **Licence claims need evidence.** `terms_checked_at` is the date you actually
  read the terms; record the URL. Unclear terms are a blocker — escalate.
- **`schemas/` is generated.** Edit `packages/contracts/src/`, run
  `npm run schemas:build`, commit the result. Never hand-edit `schemas/`.
- **Names are presentation; official codes are join keys.**
- **No secrets in the browser.** Credentials are a Worker concern.

## Where things are

|                |                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- |
| Add a source   | [`docs/adding-a-data-source.md`](docs/adding-a-data-source.md) — the playbook             |
| Worked example | `catalog/sources/statec-lustat.yaml`, `pipeline/src/letzscan/connectors/statec_lustat.py` |
| Architecture   | [`docs/architecture.md`](docs/architecture.md)                                            |
| Decisions      | [`docs/adr/`](docs/adr/README.md) — 0002 is the central one                               |
| Licensing      | [`DATA_LICENSES.md`](DATA_LICENSES.md)                                                    |
| Contributing   | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                      |

## Escalate, do not decide alone

An unclear or conflicting licence; a geography or geometry producer choice; any
change to a canonical contract; any new dependency; anything that would touch
`main` directly or weaken a CI gate.
