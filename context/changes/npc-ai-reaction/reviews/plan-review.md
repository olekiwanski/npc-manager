<!-- PLAN-REVIEW-REPORT -->
# Plan Review: NPC AI Reaction Implementation Plan

- **Plan**: `context/changes/npc-ai-reaction/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-04
- **Verdict**: REVISE → SOUND (after fixes)
- **Findings**: 0 critical | 2 warnings | 3 observations

## Verdicts

| Dimension | Verdict |
|---|---|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

8/8 paths ✓ (5 existing verified, 3 new dirs correctly absent), 3/3 symbols ✓ (missingConfigs auto-iteration, @/lib/ island import pattern, astro:env/server exclusion convention), brief↔plan ⚠️ (F3 — resolved)

## Findings

### F1 — react() HTTP status contract is implicit

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 — interface.ts contract; Phase 4 — island error handling
- **Detail**: The island branches on `!res.ok` (non-200 → JSON error body; 200 → SSE stream). Phase 1.4 said AnthropicClient returns "a one-shot error frame response" for upstream failures without specifying HTTP 200. An implementer setting status 500 makes the island call `await res.json()` on an SSE body, producing a silent SyntaxError.
- **Fix**: Added explicit HTTP 200 invariant to the `AiClientInterface.react()` contract in Phase 1.3.
- **Decision**: FIXED

### F2 — Context assembly Supabase errors have no specified handling

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 — reaction.ts context assembly
- **Detail**: Relationship fetch and partner-name fetch had no error handling. Supabase errors would silently produce an NPC with no relationships or crash on null destructuring.
- **Fix A ⭐ Applied**: Degrade gracefully — treat query errors as empty collections + `console.warn`. Consistent with PRD "enrich not gate."
- **Decision**: FIXED via Fix A

### F3 — Brief contradicts plan on Anthropic normalization

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: plan-brief.md — Key Decisions table, "Wire format" row
- **Detail**: Brief said "Anthropic upstream is already SSE; Ollama normalized via TransformStream." Plan correctly specifies both backends use TransformStream.
- **Fix**: Updated brief "Wire format" Why cell to: "Both backends normalized via TransformStream to custom {text,done} frames; single client reader."
- **Decision**: FIXED

### F4 — [id].ts + [id]/ nesting unverified; no routing regression check

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — manual verification
- **Detail**: `src/pages/api/npcs/[id]/reaction.ts` coexists with `[id].ts` — no codebase precedent. PATCH/DELETE on existing route could silently break.
- **Fix**: Added routing regression bullet to Phase 3 manual verification (3.6) and Progress section.
- **Decision**: FIXED

### F5 — Hardcoded "llama3" model not mentioned in manual criteria

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — manual verification 1.6
- **Detail**: Developer needs `ollama pull llama3` to test the OllamaClient path; plan didn't mention this.
- **Fix**: Added `ollama pull llama3` note to Phase 1 manual criterion 1.6.
- **Decision**: FIXED
