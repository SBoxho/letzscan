# 1. Repository shape and tooling

Date: 2026-08-17
Status: Accepted

## Context

The previous implementation mixed an exploratory notebook series, a web app, two
Python pipelines and a serverless backend at one repository root. Adding a
dataset touched five files across three layers, and a clean clone could not
rebuild the published data at all.

The rebuild needs a shape where each runtime has an obvious home, and where a
new contributor can find where a change belongs without reading the whole tree.

## Decision

**A small monorepo with npm workspaces. No Nx, no Turborepo, no pnpm.**

```
apps/web/            React + Vite application
apps/edge/           Cloudflare Worker
packages/contracts/  shared TypeScript contracts
pipeline/            Python package managed by uv
catalog/ schemas/ fixtures/ notebooks/ docs/
```

Root `npm run` scripts orchestrate everything, including the Python commands, so
a contributor does not have to know the internal tool split.

Two deviations from the structure originally sketched, both deliberate:

1. **`packages/contracts` exists.** The web app and the Worker both need the
   canonical shapes, and a shared package is the only way to have one definition
   rather than two that drift. It is also what generates `schemas/`.

2. **`schemas/` is generated, not authored.** Zod is the source of truth;
   `npm run schemas:build` emits the JSON Schema files and
   `npm run schemas:check` fails CI when they are stale. Python validates
   against those files, which is how the two languages stay aligned without a
   code generator.

Tooling choices:

| Choice                                                                  | Reason                                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| npm workspaces                                                          | Already installed, enough for four packages. A build framework at this size is overhead with no payoff.                               |
| TypeScript `strict` + `noUncheckedIndexedAccess` + `erasableSyntaxOnly` | Data code lives or dies on `undefined` handling. `erasableSyntaxOnly` keeps the source free of syntax that needs a full TS transform. |
| TypeScript `^5.9`, not 7                                                | `typescript-eslint` currently declares `typescript <6.1.0`. Adopt TS 7 when the linter supports it.                                   |
| ESLint flat config, non-type-aware                                      | Fast, and `tsc --noEmit` is already a separate gate. `--max-warnings 0`, so a warning is a failure.                                   |
| Prettier                                                                | Formatting is not a discussion.                                                                                                       |
| Vitest                                                                  | One test runner for all three TypeScript packages.                                                                                    |
| uv                                                                      | Locked, reproducible Python with no "which interpreter" ambiguity.                                                                    |
| Ruff                                                                    | Lint and format in one tool.                                                                                                          |

## Consequences

- `npm install` also builds `packages/contracts` (via its `prepare` script), so
  a fresh clone can `npm run dev` immediately.
- Editing a contract requires rebuilding that package; `npm run build` or its
  `dev` watch script handles it.
- If a fourth or fifth app appears and build times become a real problem,
  revisit the build framework decision then — with evidence.
