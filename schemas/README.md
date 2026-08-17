# Generated schemas

**Do not edit these files.** They are generated from the Zod definitions in
`../packages/contracts/src`, which are the single source of truth.

```bash
npm run schemas:build   # regenerate after changing a contract
npm run schemas:check   # CI gate: fails if the committed files are stale
```

## Why they exist

TypeScript validates with Zod. Python validates against these JSON Schema files.
Neither language restates the other's model, so the two cannot drift — and the
staleness check turns drift into a failing build rather than a runtime surprise.

They are also the machine-readable contract a third party gets if they reuse the
published artifacts.

## Semantics

Generated with **input** semantics: a field with a declared default is optional
and carries its default, so hand-authored catalogue files do not have to restate
defaults. A fully populated emitted artifact validates too.

`additionalProperties: false` throughout — which is what stops a provider field
name riding along on a canonical record.
