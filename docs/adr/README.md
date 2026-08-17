# Architecture decision records

Short records of decisions that are expensive to reverse, and why they were
made. New ADRs are numbered sequentially and never edited after acceptance —
supersede them instead.

| #                                                          | Decision                                       | Status   |
| ---------------------------------------------------------- | ---------------------------------------------- | -------- |
| [0001](0001-repository-shape-and-tooling.md)               | Repository shape and tooling                   | Accepted |
| [0002](0002-canonical-contracts-and-connector-boundary.md) | Canonical contracts and the connector boundary | Accepted |
| [0003](0003-frontend-state-ownership.md)                   | Frontend state ownership                       | Accepted |
| [0004](0004-environments-and-deployment.md)                | Environments, secrets and deployment           | Accepted |
| [0005](0005-no-database-static-first.md)                   | Static-first, and no database                  | Accepted |

Decisions deliberately deferred, each of which will get an ADR when it is made:
basemap and tile delivery, chart library, internationalisation, prerendering
place pages for search, PMTiles, browser-side Parquet, analytics, and automatic
deployment.
