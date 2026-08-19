# `statec-lustat` fixtures

Verbatim recordings of real LUSTAT responses. Nothing here is hand-written: if a
value looks odd, it is odd upstream.

## `population-by-commune.csv`

SDMX-CSV for dataflow `LU1:DF_X021(1.1)` — "Population par canton et commune".

|          |                                                                                         |
| -------- | --------------------------------------------------------------------------------------- |
| Recorded | 2026-08-19                                                                              |
| URL      | `https://lustat.statec.lu/rest/data/LU1,DF_X021,1.1/A.?startPeriod=2010&endPeriod=2026` |
| Accept   | `application/vnd.sdmx.data+csv;charset=utf-8;labels=id`                                 |
| Response | HTTP 200, 80 989 bytes                                                                  |
| SHA-256  | `7964eb2d311adee2884fd24b8a412739cb3727dbeeebf1c2f9debdfb83d07e81`                      |
| Contents | 1 921 observations: 100 communes, 12 cantons and the national total, 2010–2026          |

`labels=id` is a **media-type parameter**, not a query parameter — passing
`?labels=id` returns HTTP 422.

Why the whole recent series rather than a handful of rows: the geography
dimension mixes communes, cantons and the country, so the test that matters most
is that the published commune values sum _exactly_ to the published national
total. That is only checkable with every commune present. It holds for every
year here except 2010 — see below.

### What this recording is deliberately chosen to contain

- **A real missing value.** STATEC published no figure for Groussbus-Wal
  (LAU `0711`) in 2010: the cell is empty, with no status flag. It is recorded as
  `missing`, never as `0`. The consequence is visible in the data — the 2010
  commune figures sum to 500 333 against a published national total of 502 066,
  a 1 733-person gap. Coercing the absence to zero would silently understate the
  country by a number that still looks plausible.
- **Both communes created by the 2023 mergers**, `0711` Groussbus-Wal and `1209`
  Bous-Waldbredimus, so the current boundary version is exercised.
- **Canton rows** (`C01`–`C12`), which the connector must drop. Left in on
  purpose: a fixture with no cantons could not catch a filter regression.
- **The national total** (`T`), which becomes `geo_id: null`.

There is **no suppressed value here, because the distribution contains none** —
`OBS_STATUS` is empty on all 6 780 rows of the full series. The connector still
maps the producer's suppression codes (`c` confidential, `q` "missing value:
suppressed", from `CL_OBS_STATUS`, which `DSD_X021` declares), and those paths
are driven by CSVs built inside `tests/test_statec_lustat.py`. Writing a
plausible-looking suppressed row into this file would make a fabricated figure
indistinguishable from a recorded one.

## `canton-commune-codelist.xml`

SDMX 2.1 structure message for codelist `LU1:CL_CANTON_COMMUNE`, the source of
commune names for the published gazetteer.

|          |                                                                           |
| -------- | ------------------------------------------------------------------------- |
| Recorded | 2026-08-19                                                                |
| URL      | `https://lustat.statec.lu/rest/codelist/LU1/CL_CANTON_COMMUNE/latest`     |
| Response | HTTP 200, 50 122 bytes                                                    |
| SHA-256  | `020278d5c4b01414f77dc8bee069ef2bae39dc056abce6878c3952e0339d2820`        |
| Contents | 117 codes: `T`, 12 cantons, **104** commune codes, names in `en` and `fr` |

Kept whole rather than trimmed: it is the complete code space, and the app uses
it to tell "this is not a Luxembourg commune" apart from "we have no data for
this commune".

It carries 104 commune codes against 100 current communes, because it spans the
code space over time — `0705` Grosbous, `0710` Wahl, `1201` Bous and `1208`
Waldbredimus were retired by the 2023 mergers and carry no data. **The codelist
therefore says what a code is called, never which codes are in force**; current
membership is taken from the data, and was checked against STATEC's own LAU
register on 2026-08-19.

## Re-recording

```bash
curl -H 'Accept: application/vnd.sdmx.data+csv;charset=utf-8;labels=id' \
  'https://lustat.statec.lu/rest/data/LU1,DF_X021,1.1/A.?startPeriod=2010&endPeriod=2026' \
  -o fixtures/statec-lustat/population-by-commune.csv
```

A fixture is a contract test, not a cache. Re-record deliberately, and read the
diff: a changed figure is a revision, a changed column is a schema change, and a
changed dataflow version means the DSD needs re-reading before anything ships.
