# 4. Environments, secrets and deployment

Date: 2026-08-17
Status: Accepted

## Context

The previous implementation documented a scheduled refresh workflow that did not
exist, served data that was five weeks stale under a surface called "Live", and
had no separation between what a laptop, a preview and production could do.

Two things had to be true from day one of the rebuild: a developer must not be
able to start polling providers by accident, and no provider credential can ever
reach a browser.

## Decision

### Three environments

|                      | Local                   | Staging                             | Production                             |
| -------------------- | ----------------------- | ----------------------------------- | -------------------------------------- |
| Web                  | `vite` on :5173         | preview deployment                  | static hosting                         |
| Worker               | `wrangler dev` on :8787 | `wrangler deploy --env staging`     | `wrangler deploy --env production`     |
| Cron triggers        | **none**                | enabled                             | enabled                                |
| R2 bucket            | `letzscan-data-dev`     | `letzscan-data-staging`             | `letzscan-data`                        |
| Secrets              | `.dev.vars`, gitignored | `wrangler secret put --env staging` | `wrangler secret put --env production` |
| `VITE_DATA_BASE_URL` | `/data`                 | staging R2 custom domain            | production R2 custom domain            |

The top level of `wrangler.jsonc` is the local environment and deliberately
declares no cron. Scheduled ingestion is a deployment property, not a
development one.

### Secrets

Three mechanisms, each enforced rather than documented:

1. `.dev.vars`, `.env` and key material are gitignored, and
   `npm run check:secrets` fails if one is tracked or if a credential-shaped
   literal appears in any tracked or untracked-but-not-ignored file.
2. The Vite build **refuses to start** if any `VITE_`-prefixed variable name
   looks like a credential, because everything under that prefix is inlined into
   the bundle in clear text.
3. `apps/edge` declares which bindings are secrets, exposes only a
   `publicEnvSummary()` to responses and logs, and a test asserts no secret
   value or binding name appears in a response body.

The structural version of the rule: the browser knows two origins — published
artifacts and the LëtzScan edge API — and never calls a provider. A
credential-bearing provider is therefore always proxied, never fetched
client-side.

### Deployment

**Nothing deploys automatically yet.** CI runs checks only. Automatic deployment
gets added when there is something worth deploying and a staging environment
that has proved a release. Deploy scripts exist (`deploy:staging`,
`deploy:production`) so the path is obvious and manual.

Serving topology, when it lands: static assets and published artifacts from
R2/CDN behind cache rules; the Worker only for genuine request-time work. That
keeps the cost model flat with traffic. Consolidating the web app onto Workers
Static Assets is a one-line `assets` binding in `wrangler.jsonc` and is the
expected step at first deploy; it is not done now because it would make
`wrangler dev` depend on a built web bundle.

## Consequences

- A cron trigger cannot fire from a laptop.
- A leaked key requires someone to defeat three separate gates.
- The Worker and the web app are separate origins in local development, so CORS
  is exercised from day one rather than discovered at deploy time.
