<!-- PLAN-REVIEW-REPORT -->
# Plan Review: NPC AI Reaction (S-04) Implementation Plan

- **Plan**: `context/changes/npc-ai-reaction/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-07
- **Verdict**: SOUND (after fixes applied)
- **Findings**: 1 critical | 2 warnings | 2 observations

## Verdicts

| Dimension | Verdict |
|---|---|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | FAIL → PASS (after fixes) |
| Plan Completeness | WARNING → PASS (after fixes) |

## Grounding

9/9 paths ✓, createClient symbol ✓, ServerError props ✓ (`message?: string | null`), brief↔plan ✓

## Findings

### F1 — `zod` not installed; Phase 3 validation won't compile

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 (missing install) + Phase 3 validation contract
- **Detail**: `package.json` has no `zod` entry. Phase 3 contract uses `z.string().min(1).max(500)`. AGENTS.md mandates zod validation. Importing zod would fail to compile.
- **Fix A ⭐ Recommended**: Add `npm install zod` to Phase 1 alongside `@anthropic-ai/sdk`. Aligns with AGENTS.md, single-line fix.
- **Fix B**: Replace with inline type guard in Phase 3. No dependency, diverges from AGENTS.md convention.
- **Decision**: FIXED via Fix A — Phase 1 install step updated to `npm install @anthropic-ai/sdk zod`

### F2 — `ANTHROPIC_API_KEY` without `optional: true` breaks CI

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — `astro.config.mjs` env schema change
- **Detail**: All existing env vars use `optional: true` so CI builds without secrets. The plan added `ANTHROPIC_API_KEY` without it — CI `lint + build` would fail on every PR.
- **Fix**: Add `optional: true` to the envField declaration. Route uses non-null assertion `!` consistent with Supabase vars.
- **Decision**: FIXED — Phase 1 contract updated to `optional: true` with usage note

### F3 — SSE chunk boundary fragility in React reader

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 4 — React streaming component contract
- **Detail**: `chunk.split('\n')` approach can silently drop data if TCP splits a `data:` line across two `reader.read()` calls. Not acknowledged in the plan.
- **Fix A ⭐ Recommended**: Document as explicit MVP tradeoff — one sentence in Phase 4 contract.
- **Fix B**: Add a proper line buffer to the reader (~10 lines, correct for all conditions).
- **Decision**: FIXED via Fix A — tradeoff note added to Phase 4 contract

### F4 — First nested dynamic route in this codebase

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 3 — route file path
- **Detail**: All 9 existing API routes use flat `[id].ts`. `[id]/reaction.ts` is the first nested dynamic route. Astro supports this by design but it's untested in this codebase.
- **Fix**: Add routing smoke-test note to Phase 3 manual verification — stub route + curl before building full logic.
- **Decision**: FIXED — smoke test note added to Phase 3 manual verification

### F5 — No stream cleanup on navigation/unmount

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 4 — NpcReaction component
- **Detail**: No `AbortController` — fetch continues in background if user navigates away mid-stream (API cost, Worker connection held). Not explicitly excluded from scope.
- **Fix**: Add `AbortController` + `useEffect` cleanup to Phase 4 contract.
- **Decision**: FIXED — AbortController + useEffect cleanup added to Phase 4 contract
