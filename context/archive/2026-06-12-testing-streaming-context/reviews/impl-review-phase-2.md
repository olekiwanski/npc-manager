<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Test Phase 2 — Streaming and Context Correctness

- **Plan**: context/changes/testing-streaming-context/plan.md
- **Scope**: Phase 2 of 4
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

### F1 — Stream end leaves lineBuffer unprocessed if server omits trailing newline

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: NpcReaction.tsx:57
- **Detail**: When `done: true`, the loop breaks immediately without flushing lineBuffer. If a server sends the final `data: [DONE]` without a trailing `\n`, the sentinel sits in lineBuffer and is never processed. isStreaming is still cleared by finally, but the explicit [DONE] branch is silently skipped. Well-formed SSE always ends with `\n\n`, so the current API contract makes this unlikely — but it is an unhandled edge.
- **Fix A ⭐ Recommended**: Flush lineBuffer after the loop with the same dispatch logic.
  - Strength: Closes the gap completely; no new abstraction needed.
  - Tradeoff: Adds ~7 lines; requires extracting or duplicating the inner dispatch block.
  - Confidence: HIGH
  - Blind spot: Only reachable if a server violates the `\n\n` SSE spec.
- **Fix B**: Add a comment acknowledging the assumption: `// Server always terminates SSE with \n\n per spec; no flush needed.`
  - Strength: Zero code change.
  - Tradeoff: The assumption will silently break against non-spec servers.
  - Confidence: MED
  - Blind spot: Future server changes won't trigger it.
- **Decision**: FIXED via Fix A — post-loop lineBuffer flush added to NpcReaction.tsx

### F2 — Single-chunk test doesn't exercise the lineBuffer fix

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: NpcReaction.test.tsx:47
- **Detail**: Test case 2 passes against both pre-fix and post-fix code — it is a baseline smoke test, not a regression guard for lineBuffer. A future maintainer removing the lineBuffer accumulation would see this test stay green and may conclude the fix is safe to revert.
- **Fix**: Add a one-line comment: `// baseline: non-fragmented path; green before and after the lineBuffer fix`
- **Decision**: FIXED — baseline comment added above test case 2

### F3 — No comment explains why chunk 1 deliberately lacks `\n`

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: NpcReaction.test.tsx:35
- **Detail**: Chunk 1 intentionally omits a `\n` terminator — that's the load-bearing part of the fragmentation test. Without a comment, a future maintainer may "fix" the test data, turning a genuine regression test into a redundant copy.
- **Fix**: Add a comment above the chunks array: `// chunk 1 deliberately omits \n — forces lineBuffer accumulation`
- **Decision**: SKIPPED

### F4 — Negative assertion regex covers only 2 of 4 possible error messages

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: NpcReaction.test.tsx:44
- **Detail**: `queryByText(/network error|stream interrupted/i)` would pass if an error surfaced as "Request failed" or "No response body". The positive `findByText("hello world")` is already a sufficient guard.
- **Fix**: Remove the negative assertion — the positive findByText is sufficient.
- **Decision**: SKIPPED
