# Adding a data source

The single playbook for getting an upstream distribution onto a LëtzScan surface.
It consolidates rules that already exist — it does not introduce new ones. Where
this page and a rule-owning document differ, **the owning document wins**:

| Rule                                       | Owner                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| The connector boundary, the seven entities | [ADR 0002](adr/0002-canonical-contracts-and-connector-boundary.md) |
| Licensing, the eight rules                 | [`DATA_LICENSES.md`](../DATA_LICENSES.md)                          |
| Catalogue conventions                      | [`catalog/README.md`](../catalog/README.md)                        |
| What may be committed as a fixture         | [`fixtures/README.md`](../fixtures/README.md)                      |
| Pipeline layout and commands               | [`pipeline/README.md`](../pipeline/README.md)                      |
| Published artifact layout                  | [ADR 0006](adr/0006-published-artifact-layout.md)                  |
| `schemas/` is generated                    | [`schemas/README.md`](../schemas/README.md)                        |

The worked example throughout is `statec-lustat`, the first source through this
path. Read its files alongside this page.

---

## 0. Before you write anything

```bash
npm install && uv sync --directory pipeline
npm run verify          # must be green before you change anything
```

## 1. Read the distribution's terms, and record where you read them

This comes first because it can stop the work.

- **The distribution wins.** Record the licence of the exact distribution you
  will call, never of the portal hosting it. Portals host files under different
  terms, and one producer's datasets on the same portal routinely carry different
  licences.
- **`terms_checked_at` is a fact.** Set it only to a date on which you actually
  opened and read the terms. Put the URL you read in `licence.notes`.
- **An unclear licence is a blocker, not a detail.** Leave the source `draft`,
  say so in `notes`, and escalate. A vague licence blocks publication
  (`DATA_LICENSES.md` rule 6).
- **CC0 still gets attribution**, as good public-data practice (rule 3).

Things worth checking, learned from the first source:

- Does the terms page _name_ the distribution you are calling? STATEC's notice
  names `lustat.statec.lu` explicitly, which is what makes the grant apply rather
  than be inferred.
- Is the grant conditional? "sauf indication contraire" makes CC0 a default, so
  check the dataflow and its structure for a contrary rights annotation.
- Is there a licence field _inside_ the payload? Often not — say so in the notes,
  so the next reader knows the licence attaches externally.

## 2. Catalogue it as `draft`

`catalog/sources/<id>.yaml`, file name equal to `id`. Validation enforces that.

```bash
npm run catalog:validate
```

An **active** source must have a registered connector; a `draft` one need not.
That is the mechanical coupling between the catalogue and the code.

Also add, as the source demands them:

- `catalog/indicators/<id>.yaml` — definitions precise enough that two people
  compute the same number.
- `catalog/geographies/<id>.yaml` — the code space and a **producer-stated**
  `valid_from`. Leave `members` empty; the gazetteer is produced by the pipeline.
- `catalog/datasets/<id>.yaml` — added once the dataflow is pinned. Put the
  provider's reference-date semantics, breaks in series and coverage limits in
  `caveats`. They render next to the number.

## 3. Pin the exact distribution

Pin agency, dataflow and version — never "latest". A version bump can reorder
dimensions, and that must fail a build rather than quietly reshape a series.

Record what you observed while exploring: which endpoints 404, which formats are
served, which content negotiation works. The next person should not have to
rediscover that `?labels=id` returns 422 while the same parameter on the `Accept`
header returns 200.

## 4. Write the connector

`pipeline/src/letzscan/connectors/<id>.py`. Copy `example_local.py`; read
`statec_lustat.py` for a real one.

> **Provider-specific schemas are transformed at the connector boundary.
> Product code consumes canonical LëtzScan contracts.**

The connector is the **only** place allowed to know the provider's field names,
encoding, projection, date order or suppression markers. It returns canonical
records plus provenance.

Non-negotiable behaviour:

- **Missing is missing.** `suppressed` (withheld) and `missing` (never published)
  are different facts. Neither is ever `0`, and neither is ever dropped.
- **`geo_id: null` means national** — an explicit null, never an omitted key.
- **Map the producer's own status vocabulary**, and raise on a code you have not
  mapped. Assuming an unknown flag means "observed" is how a withheld value
  becomes a published number.
- **Fail loudly on a reshape.** A renamed column, an unexpected frequency, an
  unknown geography code or an empty parse is an error — never a thinner dataset
  that still validates.
- **Carry warnings**, do not swallow them. They reach the release manifest and
  `/status`.
- **Decode strictly.** Luxembourg names carry umlauts; mojibake in a join key is
  worse than a failed build.

Register it in `pipeline/src/letzscan/connectors/__init__.py`.

## 5. Record a fixture

`fixtures/<id>/`, plus a README stating the URL, the date, the response status,
the byte count and the SHA-256.

- **A recording, never a hand-write.** Fabricating a plausible row is the worst
  failure available to this project: it is indistinguishable from real data.
- **Smallest _useful_ sample.** Small is a means, not the goal. If an invariant
  worth testing needs the whole current series, record it and say why.
- **Choose it to contain the awkward cases** the distribution really has, and
  **say in the README which cases it does not contain.** If the provider declares
  a suppression code but never emits one, drive that path from a payload built
  inside the test — not from a file under `fixtures/` that a later reader could
  mistake for a recording.
- Never a credential, never a copyrighted body, never personal data.

## 6. Test it

`pipeline/tests/test_<id>.py`. Copy
`test_no_provider_field_names_survive_the_boundary` — it is the point.

Cover at least: canonical records validate; real published figures parse exactly;
a suppressed value and a missing value, each null and each distinct; no provider
token survives serialisation; a reshaped payload raises; provenance carries a
timezone-aware timestamp and a checksum.

Then **delete the fixture and run the tests**. They must fail, and for the right
reason. If they pass, they were not testing the recording.

## 7. Publish

```bash
uv run --directory pipeline letzscan run <id> --out .out       # draft release
uv run --directory pipeline letzscan publish <id> --out .out/published
```

Artifacts are canonical entities under an immutable release id; `latest.json` is
written last, so a failed build cannot change what users see. Checksums are
computed from the bytes actually written. See ADR 0006.

Regenerate the small snapshot committed for local development with:

```bash
npm run data:snapshot
```

## 8. Render it, and make the failures different

A surface must distinguish, visibly:

| State                | Means                                                          |
| -------------------- | -------------------------------------------------------------- |
| unknown place        | the id is not in the published geography set                   |
| no data              | the place is real, this release has no figure for it           |
| suppressed / missing | the producer published no value — **not zero**                 |
| unavailable          | the artifact could not be read — a service problem, not a fact |

Validate every payload at the network boundary (`fetchContract`). Read licence,
attribution, unit and caveats from the artifact — **a licence string in a React
component is a bug**.

## 9. Flip to `active`, and finish the paperwork

Set `status: active` only once it genuinely publishes, then update:

- `README.md` status section
- `DATA_LICENSES.md` "Current sources"
- `fixtures/README.md` contents table
- an ADR for every decision you were forced to make

```bash
npm run verify          # all of it, exactly as CI runs it
```

## Escalate, do not decide alone

- an unclear licence, or one that conflicts with the catalogue
- a geography or geometry producer choice — it affects every future dataset
- any change to a canonical contract in `packages/contracts/`
- any new dependency
- anything that would touch `main` directly or weaken a CI gate
