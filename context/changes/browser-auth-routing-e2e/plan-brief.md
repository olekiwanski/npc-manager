# Browser Auth and Routing E2E — Plan Brief

> Full plan: `context/changes/browser-auth-routing-e2e/plan.md`
> Research: `context/changes/browser-auth-routing-e2e/research.md`

## What & Why

Phase 4 of the test plan. Adds Playwright E2E coverage for the two remaining
auth risks: Risk #7 (the full sign-in loop — form → Supabase → session cookie →
middleware → redirect — has never been exercised in a real browser) and the
infrastructure it depends on. Risk #6 (unauthenticated redirect) is already
done in `e2e/seed.spec.ts`.

## Starting Point

`playwright.config.ts` exists with an `unauthenticated` project active and
`setup`/`authenticated` projects commented out. `e2e/seed.spec.ts` passes.
`playwright/.auth/` is empty and gitignored. No `TEST_EMAIL`/`TEST_PASSWORD`
env vars are documented or loaded.

## Desired End State

Two new E2E files (`e2e/auth.setup.ts` + `e2e/signin.auth.spec.ts`) pass
against a local Supabase instance. The happy-path test follows a real browser
through the complete auth loop and lands on `/campaigns` with the session
active. The error-path test confirms wrong credentials stay on the sign-in page
with an error message visible.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Test account provisioning | Manual via Supabase Studio UI | Matches how the project already manages local Supabase; no extra tooling or secrets | Plan |
| Error path coverage | Include in same file (`signin.auth.spec.ts`) | Research mapped the failure redirect path at zero extra infrastructure cost | Plan |
| Session cleanup | Save storageState only, no sign-out | Canonical Playwright auth setup pattern; live session expiry is negligible in dev | Plan |
| test-plan.md fix | Part of this change (Phase 1) | Research flagged it as a prerequisite; it's a one-line correction | Plan |
| storageState for sign-in tests | Empty for both tests | Both tests exercise the sign-in form from scratch — pre-loaded session is not the thing being tested | Plan |
| TEST vars loading | `readFileSync` parser in `playwright.config.ts` | Avoids adding `dotenv` dependency; `.dev.vars` is already standard `KEY=VALUE` format | Plan |
| Redirect target (Risk #7) | `/campaigns` (not `/dashboard`) | `src/pages/api/auth/signin.ts:19` redirects to `/campaigns`; `/dashboard` is a thin 302 shim | Research |

## Scope

**In scope:**
- One-line fix to `test-plan.md` Risk #7 guidance
- `.dev.vars` / `.env.example` — document `TEST_EMAIL` + `TEST_PASSWORD`
- `playwright.config.ts` — `.dev.vars` loader + uncomment setup/authenticated projects
- `e2e/auth.setup.ts` — sign-in + storageState write
- `e2e/signin.auth.spec.ts` — Risk #7 happy path + error path

**Out of scope:**
- Wiring E2E into CI (local-only per test-plan §5)
- Sign-up, sign-out, or password-reset E2E tests
- Cross-browser testing

## Architecture / Approach

Standard Playwright authenticated-project pattern: `auth.setup.ts` runs first
(as a dedicated `setup` project), signs in once, and writes session cookies to
`playwright/.auth/user.json`. The `authenticated` project depends on `setup`
and loads `user.json` as default `storageState`. The two `signin.auth.spec.ts`
tests override `storageState` to empty so they test the sign-in form itself
from a clean state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Fix test-plan.md | Correct Risk #7 redirect target before any code lands | None — one-line edit |
| 2. Infrastructure | TEST vars available in Playwright process; config projects activated | `.dev.vars` parsing edge cases (handled by simple parser) |
| 3. Auth setup file | `playwright/.auth/user.json` created by sign-in | Requires working local Supabase + TEST account to exist |
| 4. Risk #7 tests | Two passing E2E tests covering full auth loop + error path | Supabase error message text must match `/invalid login credentials/i` |

**Prerequisites:** `npx supabase start` running; test account created in Studio
(`localhost:54323`); `TEST_EMAIL` + `TEST_PASSWORD` in `.dev.vars`.
**Estimated effort:** ~1 session across 4 phases (phases 1–3 are small; phase 4
is the only file with non-trivial test logic).

## Open Risks & Assumptions

- Supabase Auth returns "Invalid login credentials" for wrong passwords — if
  the local version returns a different string, the error-path assertion needs
  updating (use `page.url()` containing `?error=` as a fallback).
- `playwright/.auth/user.json` persists between runs. If the local Supabase
  instance is reset and the test account deleted, the auth setup will fail
  until the account is recreated and the old `user.json` removed.

## Success Criteria (Summary)

- `npm run test:e2e` exits 0 with all tests passing (seed + auth setup + both signin tests).
- Playwright HTML report shows the happy-path test landing on `/campaigns` with
  email visible in the topbar.
- Error-path test shows "Invalid login credentials" on the sign-in page.
