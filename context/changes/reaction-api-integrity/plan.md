# API Route Integrity Tests — Phase 1 (Risks #1, #2, #5) Implementation Plan

## Overview

Write Vitest unit/integration tests that prove the `/reaction` endpoint rejects invalid inputs (Risk #1), unauthenticated and cross-user requests (Risk #2), and returns a clean 503 when `ANTHROPIC_API_KEY` is absent (Risk #5). No production code changes. All Anthropic SDK, Supabase, and `astro:env/server` dependencies are fully mocked.

## Current State Analysis

- Route under test: `src/pages/api/npcs/[id]/reaction.ts` — exports `POST: APIRoute`
- Guard sequence (sequential, each short-circuits): API key (line 22) → auth (line 26) → Zod body (line 39) → NPC ownership query (line 49)
- Two existing co-located test files establish the test pattern: `src/lib/utils.test.ts`, `src/lib/npc-reaction.test.ts`
- `astro:env/server` is a virtual module — importing the route in Vitest without mocking it throws `Cannot find module`; all three vi.mock calls must be hoisted before the import
- `context/foundation/test-plan.md §6.2` is marked TBD — updated in Phase 2 as the cookbook fill-in

## Desired End State

Five tests pass across two files: three Zod rejection cases, one unauthenticated rejection, one cross-user IDOR rejection, and one missing-key 503. `§6.2` of the test-plan documents the complete mocking pattern for future route tests. Phase 1 status in the test-plan advances to `complete`.

### Key Discoveries

- `vi.mock("astro:env/server", ...)` must appear before any import of the route (Vitest hoisting handles this automatically when placed at file top)
- Guard order means Zod tests need a valid user + non-null supabase mock; without them, the auth guard at line 26 fires first and returns 401 instead of 400
- `.eq()` on the Supabase mock returns `this` — `toHaveBeenCalledWith("user_id", userId)` checks *any* call on the chain, which is sufficient to prove the ownership filter is present
- Risk #5 test uses a separate file because `vi.mock` is hoisted and applies to the whole file; overriding `ANTHROPIC_API_KEY` to `undefined` in the same file as the auth tests would affect all tests in that file

## What We're NOT Doing

- No production code changes
- No happy-path / streaming test — that is Phase 2 (Risks #3 and #4) of the test rollout plan
- No test for `createClient` returning `null` (SUPABASE_URL/KEY absent) — this is an edge case of the same 401 guard already covered by the unauthenticated test; adding it would be a redundant copy
- No mutation testing (Stryker) in this phase — mutation score is tracked manually after the tests pass, per CLAUDE.md Lesson 2 guidance

## Implementation Approach

Two sequential phases. Phase 1 establishes the mock scaffold and covers the two highest-priority risks (#1 and #2) in a single file — all mock infrastructure is verified here. Phase 2 adds the isolated missing-key file (no shared state issues) and fills in the cookbook.

## Critical Implementation Details

**Guard ordering creates a prerequisite for Zod tests.** The auth guard (line 26) fires before Zod (line 39). Zod tests must therefore inject a valid `locals.user` AND configure `createClient` to return a non-null mock — otherwise the test gets 401 instead of 400 and the Zod case is never exercised.

**`vi.mock` hoisting is load-bearing.** Vitest transforms `vi.mock(...)` calls to the top of the module before imports run. This means even though `vi.mock("astro:env/server", ...)` appears after the import statement in source order, it executes first at runtime. No special ordering is needed — but the mock factory must not reference variables defined outside the factory (they aren't initialized yet when the factory runs).

---

## Phase 1: Mock scaffold + validation/auth tests (Risks #1 and #2)

### Overview

Create the main test file with all shared mock infrastructure and five test cases: three Zod validation rejections (Risk #1) and two auth/ownership rejections (Risk #2).

### Changes Required

#### 1. Create `src/pages/api/npcs/[id]/reaction.test.ts`

**File**: `src/pages/api/npcs/[id]/reaction.test.ts`

**Intent**: Test all Zod validation failure paths and both auth/ownership failure paths against the `POST` handler, using mocked versions of every external dependency. The file is co-located with the route following the `*.test.ts` convention established in `src/lib/`.

**Contract**:

First import line (matches existing test pattern in `src/lib/npc-reaction.test.ts:1`):
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
```

Three module-level `vi.mock` calls (hoisted by Vitest):
- `"astro:env/server"` → `{ ANTHROPIC_API_KEY: "test-key", SUPABASE_URL: "http://localhost", SUPABASE_KEY: "test-key" }`
- `"@/lib/supabase"` → `{ createClient: vi.fn() }`
- `"@anthropic-ai/sdk"` → `{ default: vi.fn().mockImplementation(() => ({ messages: { stream: vi.fn() } })) }`

`makeSupabaseMock()` helper — returns a fresh object each call (call in `beforeEach` to prevent cross-test state):
```typescript
function makeSupabaseMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}
```

`makeContext(overrides)` helper — constructs a minimal `APIContext`:
```typescript
function makeContext(overrides: {
  user?: Partial<User> | null;
  npcId?: string;
  body?: unknown;
}) {
  return {
    locals: { user: overrides.user ?? null },
    request: new Request("http://localhost/api/npcs/npc-1/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrides.body ?? { scenario: "The party confronts the merchant." }),
    }),
    cookies: { set: vi.fn(), get: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
    params: { id: overrides.npcId ?? "npc-1" },
  };
}
```

`beforeEach`: call `makeSupabaseMock()`, store `mock` and `mock._chain`, call `vi.mocked(createClient).mockReturnValue(mock as unknown as ReturnType<typeof createClient>)`. The double-cast (`as unknown as T`) is required here — partial mocks don't structurally satisfy the full Supabase client type, so TypeScript rejects a single cast.

**Risk #1 — Zod validation** (`describe("scenario validation")`):
All three tests: `user: { id: "user-1" }` (non-null), supabase mock non-null (configured in `beforeEach`), body varies.
- `scenario` is empty string `""` → `response.status === 400`
- `scenario` is 501-character string → `response.status === 400`
- body has no `scenario` key (`{}`) → `response.status === 400`

**Risk #2 — Auth/ownership** (`describe("auth and ownership")`):
- Unauthenticated: `user: null`, body valid → `response.status === 401`; assert `body.error === "Unauthorized"`
- Cross-user IDOR: `user: { id: "user-a" }`, `npcId: "npc-owned-by-b"`, `maybeSingle` returns `{ data: null, error: null }` (default) → `response.status === 404`; assert `body.error === "Not found"`; assert `mock._chain.eq` was called with `("user_id", "user-a")`. Call site: `await POST(makeContext(...) as unknown as Parameters<typeof POST>[0])` — double-cast required for the same structural-incompatibility reason as the Supabase mock.

### Success Criteria

#### Automated Verification

- `npm run test` — all 5 tests in `reaction.test.ts` pass
- `npm run lint` passes

#### Manual Verification

- `npm run test` output shows test names that map directly to the risk scenarios (e.g., "returns 400 when scenario is empty", "returns 404 and filters by user_id for cross-user NPC")

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Missing-key test + cookbook update (Risk #5)

### Overview

Add a separate test file for the `ANTHROPIC_API_KEY` absent case (Risk #5), then fill in `§6.2` of the test-plan cookbook and advance Phase 1 status to `complete`.

### Changes Required

#### 1. Create `src/pages/api/npcs/[id]/reaction.missing-key.test.ts`

**File**: `src/pages/api/npcs/[id]/reaction.missing-key.test.ts`

**Intent**: Prove the route returns a clean 503 (not an unhandled crash) when `ANTHROPIC_API_KEY` is `undefined` at runtime. This test uses a separate file because `vi.mock` is hoisted for the entire file — overriding the key to `undefined` in the same file as the auth tests would infect all auth test cases.

**Contract**: First import line: `import { vi, describe, it, expect } from "vitest"` (no `beforeEach` needed — single test, no per-test setup). Three `vi.mock` calls (same modules as Phase 1, same order):
- `"astro:env/server"` → `{ ANTHROPIC_API_KEY: undefined, SUPABASE_URL: "http://localhost", SUPABASE_KEY: "test-key" }`
- `"@/lib/supabase"` → `{ createClient: vi.fn() }` (never called — route exits at line 22 before Supabase is touched)
- `"@anthropic-ai/sdk"` → `{ default: vi.fn() }` (never called)

One test: call `POST` with a fully valid context (`user: { id: "user-1" }`, valid body) → `response.status === 503`; assert `body.error === "AI service unavailable"`.

#### 2. Update `context/foundation/test-plan.md §6.2`

**File**: `context/foundation/test-plan.md`

**Intent**: Fill in the TBD cookbook entry so future contributors know how to write route-level integration tests following the pattern established in Phase 1.

**Contract**: Replace the `§6.2` body with:
- Location: co-located with source as `src/pages/api/npcs/[id]/<route>.test.ts`
- Three required `vi.mock` calls at file top (list the three modules)
- `makeSupabaseMock()` chain pattern (builder returns `this`, `maybeSingle` returns a resolved promise)
- `makeContext()` helper shape
- Note: for tests that need `ANTHROPIC_API_KEY: undefined`, use a separate file — one `vi.mock` config per file
- Reference test: `src/pages/api/npcs/[id]/reaction.test.ts` and `reaction.missing-key.test.ts`
- Run locally: `npm run test` or `vitest run src/pages/api/npcs/[id]/reaction.test.ts`

#### 3. Update `context/foundation/test-plan.md §3 Phase 1 status`

**File**: `context/foundation/test-plan.md`

**Intent**: Advance Phase 1 status from `researched` to `complete` and confirm the change folder.

**Contract**: Change the Phase 1 row `Status` cell from `researched` to `complete`. Change folder column already reads `reaction-api-integrity` (set during research).

### Success Criteria

#### Automated Verification

- `npm run test` — all 6 tests pass (5 from Phase 1 + 1 missing-key test)
- `npm run lint` passes

#### Manual Verification

- `context/foundation/test-plan.md §6.2` is no longer TBD — contains a complete, accurate cookbook entry
- Phase 1 row in `§3` shows `complete`

**Implementation Note**: After completing this phase and all automated verification passes, Phase 1 of the test rollout is done.

---

## Testing Strategy

### Unit Tests

- `src/pages/api/npcs/[id]/reaction.test.ts` — 5 cases: 3 Zod rejections (empty, too-long, missing key), 1 unauthenticated (401), 1 IDOR (404 + spy)
- `src/pages/api/npcs/[id]/reaction.missing-key.test.ts` — 1 case: missing API key (503)

### Integration Tests

- None — Supabase and Anthropic are mocked; real HTTP calls are not tested (excluded per `test-plan.md §7`)

### Manual Testing Steps

1. Run `npm run test` — confirm all 6 tests appear and pass
2. Inspect the IDOR test output to confirm the spy assertion is exercised (not just skipped)
3. Confirm `§6.2` in `test-plan.md` reads naturally to someone unfamiliar with the codebase

## References

- Research: `context/changes/reaction-api-integrity/research.md`
- Route under test: `src/pages/api/npcs/[id]/reaction.ts`
- Existing test pattern: `src/lib/npc-reaction.test.ts`
- Test-plan Phase 1: `context/foundation/test-plan.md §3`
- Cookbook target: `context/foundation/test-plan.md §6.2`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Mock scaffold + validation/auth tests (Risks #1 and #2)

#### Automated

- [x] 1.1 `npm run test` — all 5 tests in `reaction.test.ts` pass — d3cec1d
- [x] 1.2 `npm run lint` passes — d3cec1d

#### Manual

- [x] 1.3 Test names in output map clearly to risk scenarios from test-plan §2 — d3cec1d

### Phase 2: Missing-key test + cookbook update (Risk #5)

#### Automated

- [x] 2.1 `npm run test` — all 6 tests pass (both files) — dbd662c
- [x] 2.2 `npm run lint` passes — dbd662c

#### Manual

- [x] 2.3 `test-plan.md §6.2` contains complete cookbook pattern (no longer TBD) — dbd662c
- [x] 2.4 `test-plan.md §3 Phase 1` status shows `complete` — dbd662c
