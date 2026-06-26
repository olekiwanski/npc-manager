---
date: 2026-06-12T16:30:00+02:00
researcher: Claude Sonnet 4.6
git_commit: 206975f8832febf5b807cd44163cd58d1bea2c57
branch: start-m3l3-hooks
repository: npc-manager
topic: "E2E tests for browser auth redirect and sign-in flow (Phase 4)"
tags: [research, e2e, playwright, auth, middleware, routing]
status: complete
last_updated: 2026-06-12
last_updated_by: Claude Sonnet 4.6
---

# Research: E2E tests for browser auth redirect and sign-in flow (Phase 4)

**Date**: 2026-06-12T16:30:00+02:00
**Researcher**: Claude Sonnet 4.6
**Git Commit**: 206975f8832febf5b807cd44163cd58d1bea2c57
**Branch**: start-m3l3-hooks
**Repository**: npc-manager

## Research Question

What code paths, form structure, and page headings must E2E tests exercise to cover
risks #6 (unauthenticated redirect) and #7 (sign-in flow) from `test-plan.md` Phase 4?

## Summary

The auth architecture is cookie-based SSR (Supabase `@supabase/ssr`). Middleware
intercepts every request, resolves the user from cookies, and redirects unauthenticated
requests to protected routes. The sign-in API redirects to `/campaigns` on success —
**not `/dashboard`** (see critical finding below). Risk #6 is already covered by
`e2e/seed.spec.ts`. Risk #7 needs a new `*.auth.spec.ts` file and a working local
Supabase instance.

## Critical Finding — Risk #7 Redirect Target Mismatch

`test-plan.md` line 63 states the proof of protection as:
> "click `Sign in` → `waitForURL('**/dashboard')`"

**The actual redirect is to `/campaigns`:**

- `src/pages/api/auth/signin.ts:19` — `return context.redirect("/campaigns")`
- `src/pages/dashboard.astro` — the dashboard page itself is a 302 redirect to `/campaigns`

For Risk #7, the correct assertion is `waitForURL('**/campaigns')` and
`getByRole('heading', { name: 'Campaigns' })`.

The `test-plan.md` Risk #7 guidance needs a one-line correction before plan/impl.

## Detailed Findings

### Auth flow — end-to-end path

1. **Form submit** (`src/components/auth/SignInForm.tsx:43`): `POST /api/auth/signin`
   with `formData` containing `email` and `password`.

2. **API route** (`src/pages/api/auth/signin.ts`):
   - Reads formData (`lines 5–7`)
   - Creates Supabase SSR client: `createClient(context.request.headers, context.cookies)`
   - Calls `supabase.auth.signInWithPassword({ email, password })` (`line 13`)
   - **On success (line 19):** `context.redirect("/campaigns")` — sets session cookies via
     Supabase SSR `setAll` handler before redirect
   - **On auth error (line 16):** `context.redirect("/auth/signin?error=...")` — query
     param drives the `ServerError` component in the form
   - **If Supabase not configured (line 11):** redirects with `error=Supabase is not configured`

3. **Supabase SSR client** (`src/lib/supabase.ts`):
   - `createServerClient()` from `@supabase/ssr`
   - Returns `null` if `SUPABASE_URL` or `SUPABASE_KEY` are missing
   - Cookie handlers: `getAll()` reads from `request.headers`; `setAll()` writes via
     `context.cookies.set()` — this is how the session token lands in the browser

4. **Middleware** (`src/middleware.ts:18–22`):
   - `PROTECTED_ROUTES = ["/dashboard", "/campaigns"]`
   - On every request: resolves `user` from `supabase.auth.getUser()` (reads session
     cookie)
   - If route starts with a protected prefix AND user is null → `redirect("/auth/signin")`

5. **Sign-out** (`src/pages/api/auth/signout.ts`):
   - `supabase.auth.signOut()` → clears session → `redirect("/")`

### Protected pages — headings for assertions

| Route | Protected | Main heading | Assertion |
|-------|-----------|--------------|-----------|
| `/dashboard` | Yes (middleware) | none — 302 to `/campaigns` | Do not assert heading; use `waitForURL('**/campaigns')` |
| `/campaigns` | Yes | `"Campaigns"` (`campaigns/index.astro:31`) | `getByRole('heading', { name: 'Campaigns' })` |
| `/auth/signin` | No | `"Sign in"` (`auth/signin.astro:14`) | `getByRole('heading', { name: 'Sign in' })` |
| `/auth/signup` | No | `"Sign up"` (`auth/signup.astro:13`) | `getByRole('heading', { name: 'Sign up' })` |
| `/` | No | `"10x Astro Starter"` (Welcome.astro:35) | `getByRole('heading', { name: '10x Astro Starter' })` |

**Topbar logged-in indicator** (`src/components/Topbar.astro:11`):
`<span class="text-blue-100/70">{user.email}</span>` — visible on `/campaigns` and `/`
when logged in. Useful secondary assertion: `page.getByText(TEST_EMAIL)`.

### Sign-in form — locators

All in `src/components/auth/SignInForm.tsx` + `FormField.tsx`:

```typescript
page.getByLabel("Email")                            // input id="email"
page.getByLabel("Password")                         // input id="password"
page.getByRole("button", { name: "Sign in" })       // SubmitButton text
```

No ARIA roles beyond native HTML — `getByLabel` is the canonical locator here.

### Existing E2E infrastructure

- **`playwright.config.ts`**: baseURL `http://localhost:4321`, webServer `npm run dev`,
  project `unauthenticated` (matches `*.spec.ts`), project `authenticated` (template
  commented out, matches `*.auth.spec.ts`).
- **`e2e/seed.spec.ts`**: Two tests covering Risk #6 — redirect from `/dashboard` and
  `/campaigns` to `/auth/signin`. Both verified green + intentional breaking confirmed
  they catch the real regression.
- **`playwright/.auth/`**: Directory exists, empty — waiting for `auth.setup.ts`.

### Environment variables

`.dev.vars` has `SUPABASE_URL` and `SUPABASE_KEY` (local Supabase).
Missing for Phase 4: `TEST_EMAIL` and `TEST_PASSWORD` — must be added to `.dev.vars`
and to the test runner env before Risk #7 tests can run.

### Auth API surface

| Endpoint | Method | Success redirect | Failure redirect |
|----------|--------|-----------------|-----------------|
| `/api/auth/signin` | POST | `/campaigns` | `/auth/signin?error=...` |
| `/api/auth/signup` | POST | `/auth/confirm-email` | `/auth/signup?error=...` |
| `/api/auth/signout` | POST | `/` | `/` (silent) |

## Code References

- `src/middleware.ts:4` — `PROTECTED_ROUTES = ["/dashboard", "/campaigns"]`
- `src/middleware.ts:18–22` — redirect logic (unauthenticated → `/auth/signin`)
- `src/pages/api/auth/signin.ts:13` — `supabase.auth.signInWithPassword()`
- `src/pages/api/auth/signin.ts:19` — success redirect to `/campaigns`
- `src/lib/supabase.ts` — SSR client factory, returns null when env vars absent
- `src/components/auth/SignInForm.tsx:43` — form action `POST /api/auth/signin`
- `src/components/auth/FormField.tsx:37` — `<label htmlFor={id}>` (drives `getByLabel`)
- `src/pages/campaigns/index.astro:31` — `<h1>Campaigns</h1>`
- `src/components/Topbar.astro:11` — `{user.email}` display (logged-in indicator)
- `e2e/seed.spec.ts:4` — `test.use({ storageState: { cookies: [], origins: [] } })`

## Architecture Insights

- **Middleware runs before page redirect.** `/dashboard` itself issues a 302 to
  `/campaigns`, but middleware intercepts first — so an unauthenticated visit to
  `/dashboard` hits the middleware redirect, never the page-level redirect.
- **Session via cookies only.** No localStorage or JWT in headers. Playwright's
  `storageState` saves cookies — this is sufficient for session persistence.
- **Supabase null-safety.** The client returns `null` when env vars are missing; all
  callers guard with `if (supabase)`. The E2E dev server needs `.dev.vars` populated.
- **Sign-in redirects to `/campaigns`, not `/dashboard`.** The dashboard page is a
  thin redirect shim. Plan/impl must target `/campaigns` in Risk #7 assertions.

## Historical Context

- `context/archive/2026-06-08-reaction-api-integrity` — Phase 1 covered auth bypass
  (Risk #2) at unit level with mocked Supabase. Phase 4 is the first time auth is
  tested through a real browser + real Supabase.
- `context/archive/2026-06-12-testing-ci-gate` — CI does not run E2E. Phase 4 tests
  are local-only (see test-plan.md §5 quality gates).

## Open Questions

1. **TEST_EMAIL / TEST_PASSWORD**: A test Supabase account must be created in the local
   instance before Risk #7 tests can run. Who creates it and how (SQL seed or Supabase
   Studio UI)?
2. **Risk #7 description in test-plan.md**: The redirect target says `/dashboard` but
   code goes to `/campaigns`. Update before `/10x-plan` writes the implementation plan.
3. **CI gate for E2E**: Phase 4 is deliberately local-only. No action needed now, but
   if CI coverage of E2E is added later, `TEST_EMAIL`/`TEST_PASSWORD` must become
   CI secrets and `npx supabase start` must run in the CI job.
