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

| Source                                                          | Status     | Licence | Terms read | Read at                                                                                                |
| --------------------------------------------------------------- | ---------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `statec-lustat` — STATEC LUSTAT statistical database (SDMX API) | **active** | CC0-1.0 | 2026-08-19 | [statistiques.public.lu/fr/support/notice.html](https://statistiques.public.lu/fr/support/notice.html) |
| `statec-lau-codes` — STATEC LAU code register                   | draft      | CC0-1.0 | 2026-08-19 | [statistiques.public.lu/fr/support/notice.html](https://statistiques.public.lu/fr/support/notice.html) |

Both records rest on STATEC's own legal notice, section "Open Data et propriété
intellectuelle (Copyright)", which publishes its content "sans restriction, sous
les termes du Transfert universel dans le Domaine Public Creative Commons CC0
1.0". The CGU on that page names both `statistiques.public.lu` **and**
`lustat.statec.lu`, so the grant reaches the distribution actually called rather
than being inferred from a portal. It is corroborated for the API by
[data.public.lu](https://data.public.lu/fr/datasets/api-de-la-base-de-donnees-lustat/),
which records `cc-zero`.

Two limits a re-checker should know. The grant is worded "sauf indication
contraire", so it is a default rather than a per-dataflow statement — the
`DF_X021` dataflow and its structure were checked for a contrary rights
annotation and carry none. And there is no licence field inside the SDMX payload
itself: the terms attach through the site notice, not the API response.

CC0 imposes no attribution condition. STATEC asks reusers to follow its Open Data
guidelines as a matter of goodwill, and LëtzScan attributes anyway, per rule 3.

`catalog/` remains the authoritative record; this table is a summary of it. A
generated, always-current listing is still to come.
