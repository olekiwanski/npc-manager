<!-- PLAN-REVIEW-REPORT -->
# Plan Review: API Route Integrity Tests — Phase 1 (Risks #1, #2, #5)

- **Plan**: context/changes/reaction-api-integrity/plan.md
- **Mode**: Deep
- **Date**: 2026-06-08
- **Verdict**: SOUND (after triage fixes)
- **Findings**: 0 critical · 1 warning · 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

4/4 paths ✓ · POST/createClient/ANTHROPIC_API_KEY symbols ✓ · brief↔plan ✓

## Findings

### F1 — Vitest utilities used but never imported; lint step will fail

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 & 2 Contract sections
- **Detail**: `vi.fn()`, `vi.mock()`, `vi.mocked()`, `beforeEach` used throughout but no import shown. `tsconfig.json` has no `"types": ["vitest/globals"]`. ESLint runs TypeScript type-checking (`projectService: true`, `strictTypeChecked`) on all `*.ts` files. Without explicit import, TypeScript reports `Cannot find name 'vi'`, failing `npm run lint` (criteria 1.2, 2.2). Existing tests use explicit imports: `import { describe, expect, it } from "vitest"` (`npc-reaction.test.ts:1`).
- **Fix**: Added `import { vi, describe, it, expect, beforeEach } from "vitest"` as first import in Phase 1 Contract; `import { vi, describe, it, expect } from "vitest"` for Phase 2 (no `beforeEach` needed — single test file).
- **Decision**: FIXED

### F2 — Mock-to-type cast likely needs double-cast `as unknown as T`

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Contract — `beforeEach` and test call sites
- **Detail**: `mock as ReturnType<typeof createClient>` and `ctx as Parameters<typeof POST>[0]` — partial mocks cast to complex types. TypeScript strict mode may reject single-cast between structurally incompatible types.
- **Fix**: Updated both cast sites to use `as unknown as T` double-cast form. Added explanatory note that partial mocks require this pattern.
- **Decision**: FIXED

### F3 — Phase 2 contract says "from `researched` to `complete`" — already `planned`

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 §Changes Required — item 3 Contract
- **Detail**: Contract says "from `researched` to `complete`" but §3 row was already advanced to `planned` when the plan was written. Implementer won't find `researched` in that cell. End goal (`complete`) is correct.
- **Decision**: ACCEPTED — implementer will figure it out; the goal is clear.
