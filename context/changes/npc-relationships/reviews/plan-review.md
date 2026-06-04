<!-- PLAN-REVIEW-REPORT -->
# Plan Review: NPC Relationships (S-03)

- **Plan**: `context/changes/npc-relationships/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-04
- **Verdict**: SOUND
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

6/6 paths ✓, migration order ✓ (`...000000` campaigns → `...010000` npcs → `...020000` new), RLS subquery correlation verified correct, Progress↔Phase mapping ✓, brief↔plan ✓.

Verified-correct risky claims:
- **RLS insert policy correlation**: `from_npc_id in (select id from public.npcs where campaign_id = npc_has_npc.campaign_id and user_id = auth.uid())` resolves correctly — unqualified `campaign_id`/`user_id` bind to the subquery's `npcs`, `npc_has_npc.campaign_id` binds to the inserting row. Same-campaign + dual ownership genuinely enforced.
- **API two-NPC 404 check**: `where campaign_id = X and id in (from, to)` expecting exactly 2 rows correctly rejects a cross-campaign pair even when both NPCs are owned.
- **Progress↔Phase**: one `## Progress`, all four phases matched, every success-criterion bullet has a `- [ ] N.M` (1.5 consolidates the two RLS-reject bullets — acceptable).

## Findings

### F1 — Relationships list has no deterministic order

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 4 (SSR `.or()` query) + Phase 3 (optimistic append)
- **Detail**: The SSR query was `.or("from_npc_id.eq.X,to_npc_id.eq.X")` with no `.order(...)`. On create, the island appends the new row to the end of local state. Postgres returns rows in arbitrary physical order, so after a reload the list can reorder and the optimistic "appended at bottom" position won't match.
- **Fix**: Add `.order("created_at", { ascending: true })` to the SSR relationships query; appending the created row to the end then matches the reloaded order. (created_at already exists; no schema change.)
- **Decision**: FIXED (Fix in plan — Phase 4 query now specifies the ascending `created_at` order, with a note that the island's append-to-end matches it)

### F2 — Roster SSR select vs. `campaignNpcs: Npc[]` prop type

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 4 query (a) vs Phase 3 prop
- **Detail**: Phase 4 suggested `select id, name from npcs` "typed as a lightweight `Npc[]` subset or full `Npc[]`", but `RelationshipSectionProps.campaignNpcs` is firmly `Npc[]`. The "id, name" path makes the `Npc[]` cast unsound (missing fields). The island only reads id + name.
- **Fix**: Use `select("*")` for the roster (matches the existing detail-page `select("*")` on `index.astro:17`, keeps the `Npc[]` cast honest) and drop the "lightweight subset" wording.
- **Decision**: FIXED (Fix in plan — Phase 4 roster query changed to `select * ... order by name`, typed `Npc[]`; ambiguity removed)

### F3 — Phase 4 layout guidance is soft on the one risk it names

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 4 layout instruction
- **Detail**: The brief flags "widening the static page layout without regressing existing chrome" as Phase 4's key risk, but the plan resolved it only as "widen from `max-w-2xl` ... match the cosmic styling." The target width wasn't pinned.
- **Fix**: Name a concrete target.
- **Decision**: FIXED (Fix differently — kept the profile card at `max-w-2xl` and stacked the Relationships section below in the same column, no container widening; also corrected the Key Discoveries note that previously said "widening the page" for internal consistency)

## Triage Summary

- **Fixed**: F1, F2, F3 (3)
- **Skipped / Accepted / Dismissed**: none
- **Verdict after fixes**: SOUND (was already SOUND — now tighter)
