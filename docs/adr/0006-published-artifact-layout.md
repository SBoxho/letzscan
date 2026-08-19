# 6. Published artifact layout

Date: 2026-08-19
Status: Accepted

## Context

The first vertical slice needed something for `/places/:geoId` to read. A place
page wants a value, its unit, its period, the source it came from, that source's
licence and attribution, and the caveats that make the number comparable.

The obvious move is a per-place envelope — one file with everything the page
needs, one fetch, one shape. That shape would be a new canonical entity: ADR 0002
requires product code to consume canonical contracts, so an envelope invented in
`apps/web` and written by `pipeline/` with no generated schema would be exactly
the drift the repository is arranged to prevent.

So the choice was: add an eighth canonical entity, or compose the seven that
already exist.

## Decision

**The published artifacts are canonical entities. There is no place-profile
envelope, and no contract was changed.**

```
published/latest.json                                  Release
published/{release_id}/catalog/sources/{id}.json       Source
published/{release_id}/catalog/datasets/{id}.json      Dataset
published/{release_id}/catalog/indicators/{id}.json    Indicator
published/{release_id}/catalog/geographies/{id}.json   GeographySet
published/{release_id}/places/{geo_id}.json            Observation[]
published/{release_id}/national.json                   Observation[]
```

Every file validates against a schema in `schemas/` that already existed, in
both languages, before this slice began.

Three things follow from the layout, and each was a reason for it.

**The release manifest is the index.** `Release.outputs` already lists every path
published, with its checksum. The browser reads `latest.json`, then knows what
exists without probing. It never has to hardcode a dataset id, and it never has
to interpret a 404 — which is what makes "this place has no data" and "the
artifact could not be loaded" two different answers on screen rather than one
apologetic shrug.

**The catalogue reaches the UI as data.** Licence, attribution, `terms_checked_at`
and caveats are republished verbatim from `catalog/`. No component restates them,
so no component can be wrong about them later.

**The gazetteer lives in the artifact, not the catalogue.**
`catalog/geographies/lu-communes.yaml` declares the code space and keeps
`members` empty; the pipeline produces the members and the published
`GeographySet` carries them. That is what lets the app answer "is this a
commune at all?" without a network round trip per guess.

The cost is real and accepted: a cold place view is two round trips (the pointer,
then the entities), not one. The catalogue entities are shared across every
place, so TanStack Query serves them from cache after the first view, and all of
it is CDN-cached static JSON.

## Consequences

- Adding the second dataset requires no new contract and no change here: it adds
  catalogue files and its observations land under the same place paths.
- A per-place envelope remains available later, as a deliberate contract change,
  if the round trip ever measurably matters. Deferring it costs nothing now and
  avoids an eighth entity defined before a second dataset exists to test it.
- `Observation.release_id` is stamped at publication, so a value can always be
  traced to the manifest that produced it.
- Because the layout is keyed by an immutable release id and `latest.json` is
  written last, a failed publish cannot change what users see.
- The browser still validates every payload at the network boundary. A shape
  change fails visibly instead of blanking a panel.
