<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: NPC CRUD

- **Plan**: context/changes/npc-crud/plan.md
- **Scope**: All Phases (1–4)
- **Date**: 2026-06-04
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical · 3 warnings · 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Automated Verification

- `npm run test` — PASS (13/13 NPC + CampaignCard tests at review time; 18/18 after NpcList.test.tsx and NpcForm server-error test added)
- `npm run lint` — PASS on npc-crud files at commit 2646d21 (current CRLF failure in [npcId]/index.astro introduced by npc-relationships which modified that file after npc-crud)

## Findings

### F1 — NpcList missing pendingId in-flight guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality / Pattern Consistency
- **Location**: src/components/npcs/NpcList.tsx:20–33
- **Detail**: handleDelete fired DELETE requests with no in-flight guard. Two rapid confirm-clicks fire concurrent requests; second hits after row is gone, gets a 404, surfaces spurious error to user. CampaignList was fixed with pendingId guard during its review — NpcList did not inherit it.
- **Fix**: Added `pendingId: string | null` state; `handleDelete` returns early if `pendingId === id`; cleared in `finally`. Matches CampaignList pattern exactly.
- **Decision**: FIXED

### F2 — DB error silently swallowed in campaign detail page NPC list query

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/campaigns/[id]/index.astro:26–31
- **Detail**: npcResult.error never checked. Supabase error causes ?? [] fallback to silently swallow it, rendering empty NPC list with no user feedback. Same class of bug fixed in campaigns/index.astro during campaigns-crud review.
- **Fix**: Added `if (npcResult.error) return new Response("Failed to load NPCs", { status: 500 })` after the NPC query.
- **Decision**: FIXED

### F3 — NPC detail and edit pages don't cross-check npc.campaign_id vs URL param

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/pages/campaigns/[id]/npcs/[npcId]/index.astro:20–22, edit.astro:20–22
- **Detail**: Both pages looked up NPC by npcId alone. RLS guarantees user-ownership but not that the NPC belongs to the URL's campaign. A user with a stale URL could see an NPC rendered under the wrong campaign breadcrumb. Fix A applied.
- **Fix**: Added `if (npc.campaign_id !== id) return Astro.redirect(\`/campaigns/${id}\`)` in both pages after the null-NPC guard.
- **Decision**: FIXED via Fix A

### F4 — No NpcList.test.tsx

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/npcs/NpcList.tsx (no test sibling)
- **Detail**: Plan required NpcForm.test.tsx and NpcCard.test.tsx but not NpcList.test.tsx. CampaignList now has a test. NpcList's delete path and pendingId guard had no coverage.
- **Fix**: Created NpcList.test.tsx covering: empty state CTA, list render, successful delete removes card, failed delete shows ServerError, pendingId guard prevents second concurrent request. All 5 tests pass.
- **Decision**: FIXED

### F5 — NpcForm test missing server-error path

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/npcs/NpcForm.test.tsx
- **Detail**: Server-error path (ok:false → ServerError renders message) had no test. Consistent with CampaignForm omission but both miss a user-visible branch.
- **Fix**: Added test mocking fetch to return `{ ok: false }` and asserting ServerError renders the message. 7/7 tests pass.
- **Decision**: FIXED
