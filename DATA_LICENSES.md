# Data licensing

**The Apache-2.0 licence in `LICENSE` covers this repository's source code and
nothing else.**

Upstream datasets keep the terms their producers published them under. Those
terms travel with the data through every normalisation, derivation and download
LëtzScan performs. Nothing here grants anyone rights over anyone else's data.

## Where the terms are recorded

`catalog/sources/*.yaml`, one reviewed file per upstream distribution:

```yaml
licence:
  spdx: CC0-1.0
  url: https://creativecommons.org/publicdomain/zero/1.0/
  attribution: 'Source: STATEC (LUSTAT)'
terms_checked_at: '2026-08-16'
```

That catalogue is the only place licence information is written down. It reaches
the interface as data. A licence string retyped into a component is a bug,
because it is a copy that will eventually be wrong.

## Rules

1. **The distribution wins.** Licence and attribution are recorded for the exact
   distribution in use, never inferred from the portal it sits on. Portals host
   files under different terms.

2. **`terms_checked_at` is a fact.** It records when a maintainer last read the
   upstream terms. An overdue date is a task, not a formality. Producers do
   change licences.

3. **Attribution is shown, not buried.** Where a licence requires attribution,
   it appears on the view and on the download — not several clicks away. CC0
   sources are attributed too, as good public-data practice.

4. **Modification is declared.** Simplifying geometry, reprojecting, deriving a
   rate or joining to a geography is modification, and CC-BY requires saying so.
   Derived values are labelled as LëtzScan-derived and never imply producer
   endorsement.

5. **Share-alike sources are handled deliberately or not at all.** A share-alike
   input can make a derived database share-alike. Such a source stays in a
   separable layer and a separable download, or is not ingested.

6. **A vague licence blocks publication.** "Other (Open)" is not machine-readable
   permission. Clarify with the producer before a blended download ships.

7. **Combined downloads carry a manifest.** When a download draws on several
   sources, it ships the licence and attribution for each. It never claims one
   licence for inputs that differ.

8. **No archiving of copyrighted content.** For sources such as news, LëtzScan
   keeps facts — title, link, publisher, date — not article bodies or images.

## Current sources

The catalogue currently contains one reviewed entry, `statec-lustat`, in `draft`
status. Nothing is published from it yet, and its licence record is marked as
requiring verification against the distribution page before first publication.

A generated, always-current listing will be produced from `catalog/` as part of
the first vertical slice, so this section cannot drift.
