<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: NPC AI Reaction (S-04)

- **Plan**: context/changes/npc-ai-reaction/plan.md
- **Scope**: All 5 phases
- **Date**: 2026-06-07
- **Verdict**: APPROVED (all findings fixed during triage)
- **Findings**: 0 critical · 4 warnings · 6 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING → FIXED (F3) |
| Scope Discipline | PASS |
| Safety & Quality | WARNING → FIXED (F1, F2, F4, F7, F8, F10) |
| Architecture | PASS |
| Pattern Consistency | WARNING → FIXED (F5, F6, F9) |
| Success Criteria | PASS |

## Findings

### F1 — Roster query lacked explicit user ownership filter

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.ts:63
- **Detail**: Roster query fetched all NPCs by campaign_id only, without .eq("user_id", user.id). Safe given NPC ownership was already verified, but missing defence-in-depth filter.
- **Fix**: Added .eq("user_id", user.id) to the roster query.
- **Decision**: FIXED

### F2 — Relationships query not scoped to verified campaign

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/npcs/[id]/reaction.ts:58
- **Detail**: npc_has_npc query filtered only on from/to NPC ids with no campaign_id scope.
- **Fix**: Added .eq("campaign_id", npc.campaign_id) to the relationships query chain.
- **Decision**: FIXED

### F3 — SSE `break` exited inner line-loop only, not the reader loop

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Reliability
- **Location**: src/components/npcs/NpcReaction.tsx:61-62
- **Detail**: `break` on [DONE] and parsed.error only exited the inner for...of loop. Outer reader loop did one extra read. Harmless in production but a logic mismatch.
- **Fix**: Added `outer:` label to the for(;;) and changed both inner breaks to `break outer`.
- **Decision**: FIXED

### F4 — Three sequential Supabase round-trips (relationships + roster could be parallel)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Performance)
- **Location**: src/pages/api/npcs/[id]/reaction.ts:58-68
- **Detail**: Relationships and roster queries were fired sequentially despite being independent. Added one unnecessary Supabase RTT per request.
- **Fix**: Wrapped both queries in Promise.all.
- **Decision**: FIXED

### F5 — ANTHROPIC_API_KEY guard fired after three DB queries

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/npcs/[id]/reaction.ts:70
- **Detail**: Key null check ran after three Supabase round-trips. Misconfigured deployments wasted queries before returning 503.
- **Fix**: Moved ANTHROPIC_API_KEY guard to the very top of the handler.
- **Decision**: FIXED

### F6 — Supabase init checked after body parsing instead of at handler top

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/npcs/[id]/reaction.ts:44-47
- **Detail**: Sibling route [id].ts checks supabase and user together at the top. reaction.ts checked them separately.
- **Fix**: Moved createClient() to join the user check; combined into `if (!user || !supabase)`.
- **Decision**: FIXED

### F7 — setState called after unmount in finally block

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Reliability)
- **Location**: src/components/npcs/NpcReaction.tsx:83
- **Detail**: On unmount, abort fires; AbortError is filtered in catch, but finally still called setIsStreaming(false) on the unmounted component.
- **Fix**: Guard the finally setState with `if (!controller.signal.aborted)` — abort = unmount, so this prevents the no-op call cleanly.
- **Decision**: FIXED

### F8 — enqueue inside catch block could throw if stream already closed

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Reliability)
- **Location**: src/pages/api/npcs/[id]/reaction.ts:97
- **Detail**: If client disconnected, stream sink may be closed; enqueue in catch path could propagate uncaught.
- **Fix**: Wrapped the error-frame enqueue in its own try/catch.
- **Decision**: FIXED

### F9 — Textarea className used string concatenation instead of cn()

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/npcs/NpcReaction.tsx:99
- **Detail**: AGENTS.md hard rule requires cn() for all Tailwind class values. Textarea className was a static string literal.
- **Fix**: Added cn() import and wrapped textarea className in cn(…).
- **Decision**: FIXED

### F10 — SSE response missing X-Content-Type-Options: nosniff

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Security)
- **Location**: src/pages/api/npcs/[id]/reaction.ts:106-110
- **Detail**: Defence-in-depth best practice for API endpoints.
- **Fix**: Added "X-Content-Type-Options": "nosniff" to SSE response headers.
- **Decision**: FIXED
