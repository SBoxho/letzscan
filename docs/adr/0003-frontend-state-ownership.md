# 3. Frontend state ownership

Date: 2026-08-17
Status: Accepted

## Context

The previous implementation had one broad Zustand store holding both map
interaction state and fetched remote data, and a share button that wrote query
parameters nothing ever read. Deep links, the back button and share links did
not work; retry and freshness logic was reimplemented per call site.

## Decision

Three owners, no overlap.

| State                                                    | Owner                             | Test                                                |
| -------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| The view: place, indicator, comparison set, layers, time | **TanStack Router** search params | Would a user send this URL to a colleague?          |
| Remote data: published artifacts, edge API reads         | **TanStack Query**                | Did it come over the network?                       |
| Ephemeral interaction: hover, selection, open panels     | **Zustand**                       | Does it die with the tab, and would nobody miss it? |

Supporting rules:

- **URL state is validated, not trusted.** Each route declares a Zod
  `validateSearch`, so a hand-edited URL fails cleanly.
- **Nothing fetched is stored in Zustand.** `map-store.test.ts` asserts the
  store has no data-shaped keys, which turns the rule into a failing test rather
  than a code-review reminder.
- **Every network payload is validated at the boundary** by `fetchContract`,
  against a canonical contract, before any component sees it.
- **Configuration is read in exactly one module.** ESLint forbids
  `import.meta.env` outside `src/lib/env.ts`, so the list of values shipped to
  the browser stays short and auditable.
- **The map is a lazy boundary.** MapLibre is ~930 kB and must never be
  downloaded by a visitor who only opens a list.

Route search parameters use TanStack Router's code-based route tree rather than
file-based generation: eight routes do not justify a codegen step, and the tree
stays readable in one file.

## Consequences

- Every view is shareable and restorable by construction.
- Freshness, retry and caching are configured once, per source cadence, rather
  than reinvented per panel.
- A future prerendering step for place pages has a clean input: the URL already
  fully determines the view.
