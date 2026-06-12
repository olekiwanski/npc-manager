<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: API Route Integrity Tests — Phase 1

- **Plan**: context/changes/reaction-api-integrity/plan.md
- **Scope**: Phase 1 of 2
- **Date**: 2026-06-08
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical  2 warnings  1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated Verification

| Check | Result |
|---|---|
| `npm run test` — 5 tests pass | ✅ `5 passed (5)` |
| `npm run lint` passes | ✅ Clean |
| Test names map to risk scenarios | ✅ |

## Findings

### F1 — Supabase mock silently inert in validation tests

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.test.ts:51–73
- **Detail**: The three Zod tests inject a live Supabase mock but it is never called — Zod fires before the DB query. The mock's presence and `{ data: null }` default are invisible noise that could confuse future readers or hide a guard-order regression.
- **Fix**: Add comment in `describe("scenario validation")` noting the Supabase mock is inert (validation fires before the ownership query).
- **Decision**: FIXED — comment added at line 51.

### F2 — Ownership spy asserts user_id but not NPC-ID filter

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.test.ts:90
- **Detail**: IDOR test only asserted `eq("user_id", "user-a")`. Production code makes two chained `.eq()` calls — `.eq("id", npcId).eq("user_id", user.id)`. The NPC-ID half of compound ownership was not verified; a refactor dropping `.eq("id", npcId)` would pass undetected.
- **Fix A ⭐ Applied**: Added `expect(mock._chain.eq).toHaveBeenCalledWith("id", "npc-owned-by-b")` alongside the existing user_id assertion.
- **Decision**: FIXED via Fix A.

### F3 — No vi.clearAllMocks() in beforeEach

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.test.ts:45–48
- **Detail**: beforeEach resets the Supabase mock but Anthropic SDK and createClient call counts accumulate. No current test asserts counts, so no bleed today. Latent risk if Phase 2 adds count assertions.
- **Fix**: Prepend `vi.clearAllMocks()` as first line of beforeEach.
- **Decision**: SKIPPED.
