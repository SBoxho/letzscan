# 8. Basemap: ACT's open-data Carte de base, delivered as catalogue data

Date: 2026-10-13
Status: Accepted. Refines the "two origins" rule of [0004](0004-environments-and-deployment.md).

## Context

The map had no basemap by design: "a basemap is a licensing decision, not a
default". The deployed predecessor had used CARTO and OpenStreetMap community
raster tiles, whose terms do not cover production use. Those tiles failed in
exactly that way: on 2026-10-13, CARTO's `basemaps.cartocdn.com` answered every
tile request with an "API KEY REQUIRED" placeholder image, whatever the Referer.

Two keyless candidates were read on 2026-10-13:

- **ACT, geoportail.lu open-data WMTS, layer `basemap`.** CC0 according to ACT's
  own data.public.lu entry for this exact service. The country's mapping agency
  publishes it, built from its topographic database (BD-L-TC), and designed with
  a minimum of colour so thematic data can be overlaid.
- **OpenFreeMap.** Free, unlimited and keyless, with commercial use allowed. It
  is run by one company on donations, and its terms state it "may discontinue
  [the service] at any time without notice". Disputes go to arbitration under
  Hungarian law.

## Decision

**The map draws ACT's Carte de base, and the basemap reaches the browser as
catalogue data, like everything else.**

- `catalog/sources/act-geoportail-basemap.yaml` records the licence evidence,
  the attribution string and `terms_checked_at`.
- `catalog/basemaps/act-geoportail-basemap.yaml` records the tile template, the
  tile size and the zoom range. It is validated against a new `Basemap`
  canonical contract.
- The pipeline publishes every active basemap and its source with each release.
  The map reads the tiles and the attribution from that release, so no licence
  string lives in a component.

### Attribution covers OpenStreetMap as well as ACT

ACT's CC0 grant covers ACT's data. Outside Luxembourg, the same tiles are
rendered from OpenStreetMap through OpenMapTiles. geoportail.lu's own viewer
configuration lists `basemap` as an alias of its `roadmap` background and
attributes it "© MapTiler © OpenStreetMap contributors for data outside of
Luxembourg". Rendered tiles are a Produced Work under the ODbL, which requires
that attribution. The catalogued attribution credits both, and the map shows it
on the map itself.

### Contract changes

- **New `Basemap` entity.** A tile URL must be `https://` and contain `{z}`, `{x}`
  and `{y}`. It carries no licence of its own: `source_id` points at the reviewed
  source.
- **`Source.connector` is now optional.** A basemap's source is never ingested,
  so it has no connector. The catalogue validator keeps the old guarantee in a
  sharper form. An active source needs either a registered connector or an
  active basemap that displays it. An active basemap needs an active source with
  `access: open`.

### The "two origins" rule, refined

ADR 0004 says the browser knows two origins and never calls a provider. Basemap
tiles are now the single exception: MapLibre fetches them straight from the
producer. The exception is fenced so that the reason for the rule — no
credential can reach the browser — still holds by construction:

- Only a catalogued, active basemap can introduce a tile origin, and the
  validator refuses one whose source is not `access: open`.
- Tiles are imagery drawn by MapLibre. They never pass through `fetchContract`.
  Every data read still goes through the two origins.
- The template must use HTTPS. A key-bearing provider would have to be proxied
  through `apps/edge`, like any other credentialed source.

## Consequences

- The map works on any domain, including `*.pages.dev`, with no key to rotate or
  allow-list.
- Availability depends on ACT's tile service. If it is down, the map loses its
  tiles but keeps working, and the attribution still shows.
- ACT's legal notice asks users to avoid abusive request volumes. LëtzScan
  fetches tiles only as a visitor pans and zooms, never by prefetching or
  mirroring. Mirroring the tiles, for example as PMTiles on R2, would need its
  own ADR.
- `terms_checked_at` on the source must be renewed like any other. The things to
  re-check are the data.public.lu licence on the dataset, and the OSM attribution
  in geoportail.lu's viewer configuration.
- Commune boundary geometry is still deferred ([0007](0007-commune-geography-authority.md)).
  The basemap draws ACT's map but publishes no polygons LëtzScan could join to.
