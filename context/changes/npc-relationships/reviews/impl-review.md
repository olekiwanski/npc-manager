<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: NPC Relationships

- **Plan**: context/changes/npc-relationships/plan.md
- **Scope**: All Phases (1–4)
- **Date**: 2026-06-04
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical · 2 warnings · 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Automated Verification

- `npm run test` — PASS (13/13 relationship tests; 47/47 full suite after all fixes)
- `npm run lint` — PASS after .gitattributes + format fixed CRLF (1 pre-existing error in utils.test.ts unrelated to this slice)

## Findings

### F1 — SSR error checks missing on both new queries in NPC detail page

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Safety & Quality
- **Location**: src/pages/campaigns/[id]/npcs/[npcId]/index.astro:28–38
- **Detail**: Both new SSR queries (campaign NPC roster and relationships OR-query) skipped `.error` checks. Supabase failures silently rendered the island with empty partner picker and empty relationship list. Plan explicitly required error handling on both queries.
- **Fix**: Added `if (npcsResult.error) return new Response(...)` and `if (relationshipsResult.error) return new Response(...)` after each query. Also removed now-unreachable `?? []` fallbacks (TypeScript narrows data to non-null after error guard).
- **Decision**: FIXED

### F2 — RelationshipSection missing pendingDeleteId in-flight guard on delete

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence / Pattern Consistency
- **Location**: src/components/relationships/RelationshipSection.tsx:94–107
- **Detail**: handleDelete fired DELETE requests with no in-flight guard. Double-confirming sends two concurrent requests; the second gets a 404 and surfaces a spurious error. Same class of bug fixed in CampaignList and NpcList.
- **Fix**: Added `pendingDeleteId: string | null` state; guard with `if (pendingDeleteId === id) return`; set/clear around the fetch.
- **Decision**: FIXED

### F3 — CRLF in working tree caused by core.autocrlf=true

- **Severity**: OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: repo-wide (.gitattributes absent)
- **Detail**: All committed npc-relationships files were LF (confirmed via git show). CRLF injected on checkout by core.autocrlf=true. Made `npm run lint` always fail locally on Windows. CI unaffected.
- **Fix**: Created `.gitattributes` with `* text=auto eol=lf` + ran `git add --renormalize .` + `npm run format` to normalize working tree. Also fixed secondary lint issues uncovered (CampaignForm.tsx JSX comment placement, NpcList.test.tsx type errors, unnecessary ?? [] fallbacks in astro files). All 47 tests pass; lint reduced from 942 errors to 1 pre-existing.
- **Decision**: FIXED via Fix A

### F4 — OR-filter interpolates npcId path param without UUID validation

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/campaigns/[id]/npcs/[npcId]/index.astro:36
- **Detail**: OR-filter string interpolates npcId directly. PostgREST rejects malformed UUIDs with 400; RLS provides containment. Consistent with sibling pages. Low risk for MVP.
- **Decision**: SKIPPED (acceptable for MVP)
