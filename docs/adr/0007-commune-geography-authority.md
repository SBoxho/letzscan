# 7. Commune geography authority, and deferring boundary geometry

Date: 2026-08-19
Status: Accepted

## Context

`catalog/geographies/lu-communes.yaml` shipped as a placeholder with a
`valid_from` that was explicitly an assumption. Every dataset LëtzScan will ever
publish at commune level joins on this code space, so it had to be settled
against a producer, not a memory.

Two separate questions were tangled together in that file:

1. **Which codes exist, and since when?** A join key and an effective date.
2. **What shape is each commune?** Boundary geometry, a projection, a simplification
   policy, and a licence attached to all three.

They have different answers, different producers and different costs. Luxembourg
has also merged communes repeatedly — 105 in 2017, 102 from 2018, 100 today — so
"the current set" is a dated fact, not a constant.

## Decision

**`lu-communes` declares the LAU code space, sourced from STATEC's LAU code
register, with `valid_from: 2023-09-01`. Boundary geometry is deferred to its own
ADR.**

`catalog/sources/statec-lau-codes.yaml` records the register as a reviewed
source. It is `draft` and has no connector: it is the authority the code space
was _verified against_, not a series that is ingested. Naming it in the
catalogue is what stops the effective date becoming folklore again.

### Why 2023-09-01

The producer states it, and the law agrees.

- STATEC's register `A1106.xlsx` labels its current sheet, verbatim: **"codes UAL
  au 01.09.2023 (100 communes)"** — alongside "01.01.2019 / 01.01.2018 (102
  communes)" and "01.01.2017 (105 communes)". UAL is the French rendering of LAU.
- Both acts that produced the current set say in Article 13 **"La présente loi
  entre en vigueur le 1er septembre 2023"**:
  [a115](https://legilux.public.lu/eli/etat/leg/loi/2023/03/03/a115/jo) creating
  « Groussbus-Wal », and
  [a117](https://legilux.public.lu/eli/etat/leg/loi/2023/03/03/a117/jo) creating
  « Bous-Waldbredimus ».

Both were read on 2026-08-19. The codes carried by the `statec-lustat` dataflow
were checked the same day to be exactly the 100 codes in the register, so
statistical series join to this set on code with no crosswalk.

Note the trap the merger laws set: the acts are dated **3 March 2023** and take
effect on **1 September 2023**; a parliamentary vote on 8 February 2023 is
neither. And the legal name is « Groussbus-Wal », which is spelled differently by
some official sites — which is precisely why names are presentation and codes
are keys.

### Why geometry is deferred

This slice renders text. Nothing on `/places/:geoId` needs a polygon, and the
map has no basemap yet by an equally deliberate deferral. Choosing a geometry
producer now would mean choosing a projection, a simplification tolerance and a
tile format before anything renders one — decisions better made against a real
map.

The likely answer is already identified and was verified during this slice:
**ACT (Administration du cadastre et de la topographie)** publishes LIMADMIN
under CC0, carrying the same LAU2 codes, as Shapefile in EPSG:2169 (LUREF) and
GeoJSON in WGS84. It is deliberately **not** catalogued yet, because a catalogued
source implies a reviewed licence and a fixed distribution, and one caveat found
during research must be settled first: ACT's file is a monthly _current-state_
snapshot that carries no validity stamp of its own, so a build that needs
reproducibility must pin an immutable dated resource URL rather than the latest
file.

## Consequences

- Every commune-level dataset can join on `lu.commune.{LAU}` today, with a dated,
  cited code space behind it.
- The gazetteer published in the artifact carries names from the LUSTAT codelist,
  a STATEC distribution whose codes were verified identical to the register.
  Names are presentation; the register governs the codes.
- A future boundary change creates a **new** geography set plus a crosswalk and
  never mutates this one. The pre-2023 sets are not modelled, because no dataset
  needs them yet: STATEC restates this population series on current boundaries.
- Adding geometry later changes no existing identifier. It adds a source, a
  connector and geometry to the members — it does not re-key anything.
- Until then, LëtzScan cannot draw a commune, and should not pretend otherwise.
