<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: API Route Integrity Tests — Full Plan

- **Plan**: context/changes/reaction-api-integrity/plan.md
- **Scope**: Full plan (Phase 1 + Phase 2)
- **Date**: 2026-06-08
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical  3 warnings  1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Uncommitted triage fixes in reaction.test.ts

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.test.ts
- **Detail**: The impl-review triage added two correct improvements (inert-mock comment + double eq() assertion) that were in the working tree but left out of the Phase 2 commit. The change folder did not fully capture the final state of the test file it introduced.
- **Fix**: Commit reaction.test.ts and impl-review-phase-1.md in a follow-up commit.
- **Decision**: FIXED — 3bbcc91

### F2 — Inert-mock comment omits the auth guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/npcs/[id]/reaction.test.ts:51–52
- **Detail**: Comment said "Zod fires before the ownership query, so the Supabase mock is inert" but omitted that the auth guard (line 28) fires before Zod — a future maintainer could remove the valid user fixture and cause three silent 401s instead of 400s.
- **Fix**: Extend comment to mention auth guard fires first and valid user is therefore required.
- **Decision**: FIXED — abf0cae

### F3 — Cookbook §6.2 silent on async-iterable requirement for streaming tests

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: context/foundation/test-plan.md §6.2
- **Detail**: The §6.2 Anthropic mock snippet shows `stream: vi.fn()`. The route calls `for await (const event of stream)`, requiring an async iterable. A future contributor following the cookbook template for a happy-path test would hit `TypeError: stream is not iterable` with no doc to explain why. Phase 2 test rollout (streaming) will hit this directly.
- **Fix A ⭐ Applied**: Added caveat sentence after the Anthropic mock snippet: "If your test reaches the `for await` call, `stream` must return an async iterable — see §6.3 when completed."
- **Decision**: FIXED via Fix A — abf0cae

### F4 — Defensive mocks in missing-key file lack intent comments

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/npcs/[id]/reaction.missing-key.test.ts:10–16
- **Detail**: Supabase and Anthropic mocks are defensive stubs (route exits before they're called) but have no comments explaining this. Could look like copy-paste leftovers to future readers.
- **Fix**: Add one-line comment above each mock: "defensive — route exits at the API-key guard before this is called."
- **Decision**: SKIPPED.
