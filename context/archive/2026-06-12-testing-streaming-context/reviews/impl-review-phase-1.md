<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Test Phase 2 — Streaming and Context Correctness

- **Plan**: context/changes/testing-streaming-context/plan.md
- **Scope**: Phase 1 of 4
- **Date**: 2026-06-12
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical  2 warnings  2 observations

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

### F1 — Positional `from` mock silently misroutes chains if query order changes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: reaction.context.test.ts:87
- **Detail**: makeSupabaseMock() uses three sequential mockReturnValueOnce calls on from(), pinning the NPC chain to call #1, rel chain to call #2, roster chain to call #3. The production Promise.all (reaction.ts:58) dispatches both parallel queries in source order, so this works today. But if the production code ever reorders those queries, adds a query, or a future refactor moves the NPC lookup, the mock silently hands the wrong chain to the wrong query — the test stays green while context wiring breaks invisibly.
- **Fix A ⭐ Recommended**: Replace positional mockReturnValueOnce with a table-name-keyed mockImplementation.
  - Strength: Decouples the mock from call order — the rel chain is always routed correctly regardless of when from("npc_has_npc") is called.
  - Tradeoff: Needs a closure variable to distinguish the two "npcs" calls; slightly more code.
  - Confidence: HIGH — table-name approach removes the entire class of order-dependency bugs.
  - Blind spot: None significant.
- **Fix B**: Accept positional ordering, add a comment pinning the contract.
  - Strength: Zero code change; makes the assumption explicit.
  - Tradeoff: The comment decays silently — nothing enforces it.
  - Confidence: LOW — documents the trap without removing it.
  - Blind spot: Future refactors of reaction.ts won't see the comment.
- **Decision**: FIXED via Fix A — table-name-keyed mockImplementation applied

### F2 — "Fully-populated NPC" assertion omits traits

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: reaction.context.test.ts:108–112
- **Detail**: The test title says "fully-populated NPC" and the fixture includes traits: "clever, greedy". buildNpcSystemPrompt includes traits when non-null. Only name and role are asserted — a regression that drops traits from the prompt would silently pass.
- **Fix**: Add a third assertion: `expect(mockStreamCall).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("clever, greedy") }))`.
- **Decision**: FIXED — traits stringContaining assertion added

### F3 — No toHaveBeenCalledTimes(1) guard

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: reaction.context.test.ts:107
- **Detail**: Two separate toHaveBeenCalledWith assertions would both pass if stream() were called twice (a double-invocation bug). Adding toHaveBeenCalledTimes(1) closes that gap.
- **Fix**: Add `expect(mockStreamCall).toHaveBeenCalledTimes(1)` before the argument assertions.
- **Decision**: FIXED — toHaveBeenCalledTimes(1) guard added

### F4 — MockChain interface typed incompletely

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: reaction.context.test.ts:61–64
- **Detail**: MockChain declares select and eq but not maybeSingle or or. Only rosterChain is cast to MockChain, so the interface gives false confidence. Either remove it or extend it to cover all three chains fully.
- **Fix**: Remove the MockChain interface and the "as MockChain" cast; let rosterChain be inferred or use a targeted inline type assertion only for the self-referential eq setup.
- **Decision**: FIXED — interface removed; replaced with inline cast `{} as { select: ...; eq: ... }`
