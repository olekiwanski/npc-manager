# Browser Auth and Routing E2E — Implementation Plan

## Overview

Implements Phase 4 of the test plan: Playwright tests that prove the middleware
redirect (Risk #6) and the full sign-in loop (Risk #7) work in a real Chromium
browser against a live local Supabase instance. Risk #6 is already covered by
`e2e/seed.spec.ts`; this phase ships the auth setup infrastructure and two
Risk #7 tests.

## Current State Analysis

- **Risk #6** — complete. `e2e/seed.spec.ts` covers both redirect tests
  (verified green; `e2e/` exists at the root with `playwright.config.ts`).
- **Playwright config** — `playwright.config.ts` has the `unauthenticated`
  project active; `setup` and `authenticated` projects are commented out,
  waiting for `auth.setup.ts`.
- **Auth directory** — `playwright/.auth/` exists (empty) and is already
  gitignored (`.gitignore` line 39).
- **Package scripts** — `"test:e2e": "playwright test"` already in
  `package.json`; no new script needed.
- **Test-plan mismatch** — `test-plan.md` Risk #7 guidance cites `/dashboard`
  as the redirect target; `src/pages/api/auth/signin.ts:19` redirects to
  `/campaigns`. Needs a one-line fix before implementation.
- **Env vars missing** — `TEST_EMAIL` and `TEST_PASSWORD` are not yet in
  `.dev.vars` or `.env.example`.

## Desired End State

- `test-plan.md` correctly names `/campaigns` as the Risk #7 redirect target.
- `playwright.config.ts` loads `.dev.vars` into `process.env` (no new
  dependency) and has all three Playwright projects active.
- `e2e/auth.setup.ts` signs in with TEST credentials and writes
  `playwright/.auth/user.json`.
- `e2e/signin.auth.spec.ts` has two passing tests (happy path + error path),
  both verified green against a running local Supabase instance.

### Key Discoveries

- `src/pages/api/auth/signin.ts:19` — success redirect goes to `/campaigns`.
- `src/pages/campaigns/index.astro:31` — `<h1>Campaigns</h1>` is the heading
  assertion anchor after login.
- `src/components/Topbar.astro:11` — `{user.email}` renders when a session is
  active; secondary auth assertion: `page.getByText(process.env.TEST_EMAIL!)`.
- `src/components/auth/FormField.tsx:37` — `<label htmlFor={id}>` makes
  `getByLabel("Email")` and `getByLabel("Password")` the correct locators.
- `playwright/.auth/` is gitignored — a fresh clone won't have the directory,
  so `auth.setup.ts` must create it with `mkdirSync({ recursive: true })`.
- `.dev.vars` is standard `KEY=VALUE` format; `readFileSync` can parse it in
  `playwright.config.ts` without adding a `dotenv` dependency.

## What We're NOT Doing

- Wiring E2E into CI — Phase 4 is local-only per `test-plan.md` §5.
- Testing sign-up, sign-out, or password-reset flows.
- Cross-browser testing — only Chromium per the existing config.
- Adding a new Risk entry for the error path — it is an additional assertion
  inside the Risk #7 test file.

## Implementation Approach

Four phases in dependency order: fix the documentation error first, then wire
credentials and config, then create the auth setup file, then write tests.

## Phase 1: Correct test-plan.md Risk #7 Guidance

### Overview

One-line fix in the Risk Response Guidance table so the plan and tests target
the correct URL.

### Changes Required

#### 1. Risk #7 redirect correction

**File**: `context/foundation/test-plan.md`

**Intent**: Fix the "What would prove protection" cell for Risk #7 — it says
`/dashboard` but the code redirects to `/campaigns`.

**Contract**: In the Risk Response Guidance table (§2), Risk #7 row, replace:
- `waitForURL('**/dashboard')` → `waitForURL('**/campaigns')`
- `dashboard heading visible` → `campaigns heading visible`

### Success Criteria

#### Automated Verification

- Lint passes: `npm run lint`

#### Manual Verification

- Risk #7 row in the table reads `waitForURL('**/campaigns')` and
  `campaigns heading visible`

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Infrastructure

### Overview

Loads test credentials from `.dev.vars` into the Playwright test runner
process, activates the commented-out Playwright projects, and documents the
required env vars.

### Changes Required

#### 1. TEST credentials in .dev.vars

**File**: `.dev.vars`

**Intent**: Add the two env vars the E2E tests need so a developer running
`npm run test:e2e` gets them automatically via the config-level loader.

**Contract**: Append to the file:
```
TEST_EMAIL=<real Supabase test account email>
TEST_PASSWORD=<real Supabase test account password>
```
These credentials must belong to an account created manually in Supabase Studio
(`http://localhost:54323 → Authentication → Users → Add user`) before Phase 3
can run.

#### 2. .env.example documentation

**File**: `.env.example`

**Intent**: Signal to any contributor that `TEST_EMAIL` and `TEST_PASSWORD` are
needed for E2E tests so they know to create a test account.

**Contract**: Append near the bottom:
```
# E2E test account (required for Playwright Risk #7 — create via Supabase Studio localhost:54323)
# TEST_EMAIL=test@example.com
# TEST_PASSWORD=your-test-password
```

#### 3. playwright.config.ts — .dev.vars loader + project activation

**File**: `playwright.config.ts`

**Intent**: Make `TEST_EMAIL` and `TEST_PASSWORD` from `.dev.vars` available to
`process.env` inside test files, and activate the `setup` and `authenticated`
Playwright projects.

**Contract**:

At the top of the file (before `defineConfig`), add a `.dev.vars` loader that
parses `KEY=VALUE` lines and populates `process.env` for any key not already
set. It silently skips if the file is absent:

```typescript
import { readFileSync } from "fs";

try {
  readFileSync(".dev.vars", "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    });
} catch {}
```

Uncomment both project entries, adding `...devices["Desktop Chrome"]` to the
authenticated project's `use`:

```typescript
{ name: "setup", testMatch: /auth\.setup\.ts/ },
{
  name: "authenticated",
  testMatch: /\.auth\.spec\.ts$/,
  use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
  dependencies: ["setup"],
},
```

### Success Criteria

#### Automated Verification

- `npx playwright test --list` output includes entries for `[setup]` and
  `[authenticated]` projects
- Lint passes: `npm run lint`

#### Manual Verification

- `.dev.vars` contains `TEST_EMAIL` and `TEST_PASSWORD` with real credentials
- `.env.example` shows the two commented placeholder lines

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Auth Setup File

### Overview

Creates `e2e/auth.setup.ts` — the Playwright global setup that runs before any
`*.auth.spec.ts` file. Signs in with TEST credentials and saves the session
cookies to `playwright/.auth/user.json`.

### Changes Required

#### 1. e2e/auth.setup.ts

**File**: `e2e/auth.setup.ts`

**Intent**: Sign in once before authenticated tests run and persist the session
so those tests load it from disk instead of re-authenticating.

**Contract**: Import `test as setup` from `@playwright/test` and `mkdirSync`
from `"fs"`. Steps in the fixture body:

1. `mkdirSync("playwright/.auth", { recursive: true })` — ensures the
   directory exists on a fresh clone (no-op if it already exists).
2. `await page.goto("/auth/signin")`
3. `await page.getByLabel("Email").fill(process.env.TEST_EMAIL!)`
4. `await page.getByLabel("Password").fill(process.env.TEST_PASSWORD!)`
5. `await page.getByRole("button", { name: "Sign in" }).click()`
6. `await page.waitForURL("**/campaigns")` — confirms auth succeeded.
7. `await page.context().storageState({ path: "playwright/.auth/user.json" })`

### Success Criteria

#### Automated Verification

- `npx playwright test --project=setup` exits 0 and creates
  `playwright/.auth/user.json` (requires `npx supabase start` and TEST vars set)

#### Manual Verification

- `playwright/.auth/user.json` exists and its `cookies` array is non-empty

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Risk #7 Tests

### Overview

Creates `e2e/signin.auth.spec.ts` with two tests. Both override storageState to
empty so they exercise the sign-in form from a clean browser state:

- **Happy path** (Risk #7): valid credentials → redirect to `/campaigns` →
  Campaigns heading + email in topbar visible.
- **Error path**: wrong password → stay on `/auth/signin` + error message
  visible.

### Changes Required

#### 1. e2e/signin.auth.spec.ts

**File**: `e2e/signin.auth.spec.ts`

**Intent**: Prove the full browser auth loop and the sign-in error path using
the locators and assertions confirmed by the research doc.

**Contract**:

File-level `test.use({ storageState: { cookies: [], origins: [] } })` clears
session for both tests regardless of the authenticated project's default
`storageState`. This tests the sign-in flow from scratch.

**Happy-path test** — name maps to Risk #7:
1. `page.goto("/auth/signin")`
2. Fill `getByLabel("Email")` with `process.env.TEST_EMAIL!`
3. Fill `getByLabel("Password")` with `process.env.TEST_PASSWORD!`
4. Click `getByRole("button", { name: "Sign in" })`
5. `page.waitForURL("**/campaigns")`
6. `expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible()`
7. `expect(page.getByText(process.env.TEST_EMAIL!)).toBeVisible()` — topbar
   indicator confirming the session is active

**Error-path test**:
1. `page.goto("/auth/signin")`
2. Fill `getByLabel("Email")` with `process.env.TEST_EMAIL!`
3. Fill `getByLabel("Password")` with `"wrong-password"`
4. Click `getByRole("button", { name: "Sign in" })`
5. `page.waitForURL("**/auth/signin**")` — `**` suffix handles `?error=...`
6. `expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()`
7. `expect(page.getByText(/invalid login credentials/i)).toBeVisible()` —
   Supabase Auth's standard error message for wrong credentials

### Success Criteria

#### Automated Verification

- `npm run test:e2e` exits 0 with both `signin.auth.spec.ts` tests passing
  (requires `npx supabase start` and TEST vars in `.dev.vars`)
- Lint passes: `npm run lint`

#### Manual Verification

- Playwright HTML report (`playwright-report/index.html`) shows both tests green
- Trace for the happy-path test shows the browser going through the full
  sign-in flow and landing on `/campaigns`
- Error-path test shows the sign-in page with "Invalid login credentials"
  visible

**Implementation Note**: Pause for manual confirmation. Phase 4 complete.

---

## Testing Strategy

### E2E Tests

- `e2e/seed.spec.ts` — Risk #6 (already passing, no changes)
- `e2e/auth.setup.ts` — global setup; creates `playwright/.auth/user.json`
- `e2e/signin.auth.spec.ts` — Risk #7 happy path + error path

### Manual Prerequisites

1. `npx supabase start` — local Supabase must be running
2. Open `http://localhost:54323` → Authentication → Users → Add user; create
   the test account with an email and password you control
3. Add `TEST_EMAIL` and `TEST_PASSWORD` to `.dev.vars` with those credentials
4. Run: `npm run test:e2e`

## References

- Research doc: `context/changes/browser-auth-routing-e2e/research.md`
- Existing E2E pattern: `e2e/seed.spec.ts:4`
- Sign-in API redirect: `src/pages/api/auth/signin.ts:19`
- Campaigns heading: `src/pages/campaigns/index.astro:31`
- Topbar email display: `src/components/Topbar.astro:11`
- Form locator anchors: `src/components/auth/FormField.tsx:37`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Correct test-plan.md

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — bf23281

#### Manual

- [x] 1.2 Risk #7 row shows `waitForURL('**/campaigns')` and `campaigns heading visible` — bf23281

### Phase 2: Infrastructure

#### Automated

- [x] 2.1 `npx playwright test --list` shows setup + authenticated projects
- [x] 2.2 Lint passes: `npm run lint`

#### Manual

- [x] 2.3 `.dev.vars` contains TEST_EMAIL and TEST_PASSWORD with real values
- [x] 2.4 `.env.example` shows the two commented placeholder lines

### Phase 3: Auth Setup File

#### Automated

- [ ] 3.1 `npx playwright test --project=setup` exits 0 and creates `playwright/.auth/user.json`

#### Manual

- [ ] 3.2 `playwright/.auth/user.json` exists with non-empty cookies array

### Phase 4: Risk #7 Tests

#### Automated

- [ ] 4.1 `npm run test:e2e` exits 0 with both `signin.auth.spec.ts` tests passing
- [ ] 4.2 Lint passes: `npm run lint`

#### Manual

- [ ] 4.3 Playwright HTML report shows both tests green
- [ ] 4.4 Trace confirms happy-path test lands on `/campaigns` with session active
- [ ] 4.5 Error-path test shows "Invalid login credentials" visible on sign-in page
