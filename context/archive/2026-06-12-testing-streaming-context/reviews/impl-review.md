<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Test Phase 2 — Streaming and Context Correctness

- **Plan**: context/changes/testing-streaming-context/plan.md
- **Scope**: All 4 phases
- **Date**: 2026-06-12
- **Verdict**: NEEDS ATTENTION (resolved via triage)
- **Findings**: 1 critical · 1 warning · 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — stryker.config.mjs missing mutate guard

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: stryker.config.mjs:1–5
- **Detail**: No `mutate` key set. Stryker's default when --mutate is omitted scans the entire repo. Bare `npx stryker run` triggers a multi-hour full-repo mutation run.
- **Fix**: Add `mutate: []` so a bare run is a safe no-op.
- **Decision**: FIXED — added `mutate: []` to stryker.config.mjs

### F2 — Call-order-dependent Supabase mock is fragile

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/npcs/[id]/reaction.context.test.ts:81–88
- **Detail**: Mock routed from() calls by generic call-count (`npcsSeen++`). If the route reorders its parallel queries, the mock silently returns the wrong chain and the test stays green.
- **Fix A ⭐ Applied**: Rewrote to key on table name + npcs-specific counter. `from()` now dispatches explicitly: `npc_has_npc` → relChain; `npcs` (1st call) → npcChain; `npcs` (2nd call) → rosterChain.
- **Decision**: FIXED via Fix A

### F3 — Extra `traits` assertion beyond plan spec

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/npcs/[id]/reaction.context.test.ts:114–117
- **Detail**: Third assertion checking `traits` in system prompt; plan only specified name + role.
- **Fix**: Removed the extra assertion to keep the test on-spec.
- **Decision**: FIXED — extra assertion removed

### F4 — fireEvent latent race risk in NpcReaction.test.tsx

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/npcs/NpcReaction.test.tsx:41
- **Detail**: `fireEvent.change` + `fireEvent.click` in sequence — React 19 concurrent mode may not flush state between calls. Tests pass consistently; latent flakiness only. Consistent with project-wide pattern in NpcList.test.tsx.
- **Fix**: No action now. Switch to `@testing-library/user-event` if flakiness appears.
- **Decision**: SKIPPED — noted for future reference
