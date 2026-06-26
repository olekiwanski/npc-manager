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

## Ogranicz koszty przed uruchomieniem asynchronicznego ewala LLM

- **Context**: Każdy workflow CI/CD lub zadanie zdalne, które wywołuje LLM (promptfoo, custom agent) bez nadzoru człowieka.
- **Problem**: `workflow_dispatch` uruchamia ewal bez limitu — jeden run z `opus` na dużym diff może kosztować $0.20+; bez ochrony wielokrotne uruchomienia lub błędna konfiguracja mogą wygenerować nieoczekiwane rachunki.
- **Rule**: Przed wdrożeniem asynchronicznego ewala LLM upewnij się, że spełnione są trzy warunki: (1) każdy provider ma ustawiony `maxBudgetUsd` bezpośrednio w konfiguracji (np. `0.05` dla haiku/sonnet, `0.20` dla opus), (2) klucz API ma miesięczny limit wydatków ustawiony w panelu dostawcy (Anthropic Console → Usage limits), (3) trigger jest wyłącznie manualny (`workflow_dispatch`) — nigdy auto na push/PR, żeby uniknąć kosztów przy każdym mergeu.
- **Applies to**: plan, implement
