# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Assign a kill date to every feature flag

- **Context**: Any phase that introduces a feature flag
- **Problem**: Flags accumulate and are never removed, adding dead code paths and increasing test surface permanently.
- **Rule**: Always assign a kill date when introducing a feature flag. Add a TODO with the date and create a follow-up task to remove the flag.
- **Applies to**: all

## Disable no-misused-promises for .astro frontmatter redirects

- **Context**: Any `.astro` page with a top-level frontmatter `return` (e.g. `return Astro.redirect(...)` for SSR redirects / auth guards), under an ESLint config that applies `@typescript-eslint` type-checked rules to `.astro` files.
- **Problem**: `eslint .` (and CI lint) crashes with "Non-null Assertion Failed: Expected node to have a parent" — `astro-eslint-parser` emits a frontmatter top-level `return` node whose parent `@typescript-eslint/no-misused-promises` can't resolve. It's a thrown exception, not a lint finding, so it aborts the whole run. It stays latent until the first SSR-redirect page is added (campaigns-crud Phase 4).
- **Rule**: When an `.astro` page needs an SSR redirect, keep the idiomatic `return Astro.redirect(...)` and disable `@typescript-eslint/no-misused-promises` for `**/*.astro` in the eslint.config.js `.astro` override block. Never work around it by dropping the frontmatter return — that breaks the redirect.
- **Applies to**: implement, plan-review
