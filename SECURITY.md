# Security policy

## Reporting a vulnerability

Please report privately, not in a public issue.

Use GitHub's **private vulnerability reporting** on this repository
(Security → Report a vulnerability). Include what you found, how to reproduce
it, and what you think the impact is.

Expect an acknowledgement within a few days. This is a small project without an
on-call rotation; that is stated plainly rather than implied otherwise.

Please do not run automated scans against deployed environments, and do not
access, modify or exfiltrate data that is not yours.

## Scope

In scope: this repository's code, the deployed web application, and the
Cloudflare Worker API.

Out of scope: upstream data providers. If you find a problem in a Luxembourg
open-data service, report it to that producer. If a LëtzScan integration is
mishandling their data, that is in scope and worth telling us about.

## Credential handling

LëtzScan holds provider credentials for sources that require them. The design
intent is that a credential cannot reach a browser, and this is enforced in
three independent places rather than by convention:

1. **Repository.** `.dev.vars`, `.env*` and key material are gitignored.
   `npm run check:secrets` fails the build if such a file is tracked, or if a
   credential-shaped literal appears in any tracked or untracked-but-not-ignored
   file.
2. **Build.** The Vite build refuses to start if any `VITE_`-prefixed variable
   name looks like a credential, because everything under that prefix is inlined
   into the browser bundle in clear text.
3. **Runtime.** The Worker declares which bindings are secrets and exposes only
   a `publicEnvSummary()` to responses and logs. A test asserts that no secret
   value or binding name appears in a response body.

Secrets are set with `wrangler secret put --env <environment>` and in GitHub
Actions secrets. They never appear in `wrangler.jsonc`, a committed manifest, a
log line, an error message or a response.

**If you believe a credential has leaked**, report it privately and it will be
rotated at the provider before anything else is done.

## Architectural properties worth knowing

- The browser calls exactly two origins: published static artifacts and the
  LëtzScan edge API. It never calls a provider.
- There is no general-purpose proxy or pass-through fetch route, and no route
  accepts an arbitrary upstream URL.
- There is no database, no user account and no authenticated state, so there is
  no session, credential store or personal data to compromise.
- Every network payload is validated against a canonical contract before use.

## Supported versions

The project is pre-release. Only `main` is supported; there are no backports.
