<!-- PLAN-REVIEW-REPORT -->
# Plan Review: NPC CRUD Implementation Plan

- **Plan**: `context/changes/npc-crud/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-04
- **Verdict**: SOUND (after fixes)
- **Findings**: 1 critical  0 warnings  2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS (after F1 fix) |

## Grounding

5/5 paths ✓, 5/5 symbols ✓, brief↔plan ✓

Paths verified: CampaignCard.tsx, campaigns/index.ts, campaigns/[id].ts, campaigns migration, campaigns/[id]/edit.astro.
Symbols verified: middleware startsWith, CampaignList:53 mutate shape, moddatetime trigger, CampaignCard.tsx:16–47, CampaignCard.test.tsx fragility.

## Findings

### F1 — Checkboxes in phase body Success Criteria sections

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: All four phase bodies, Success Criteria sections
- **Detail**: Every Success Criteria section in the four phase bodies used `- [ ]` checkboxes. Campaigns-crud plan (the template) used plain `- ` bullets in phase bodies; checkboxes belong only in `## Progress`. Duplicate checkboxes could cause `/10x-implement` to find two copies of each step and fail to reconcile them.
- **Fix**: Strip `[ ]` from every Success Criteria bullet in the phase bodies (25 items across Phase 1–4), leaving plain `- ` dashes.
- **Decision**: FIXED — stripped checkboxes from all four phase body Success Criteria sections.

### F2 — NpcForm test contract omits create/edit rendering tests

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — NpcForm unit tests contract
- **Detail**: The plan says to mirror CampaignForm.test.tsx, which has a "rendering" suite testing create mode (fields visible) and edit mode (fields pre-filled). NpcForm contract only specified validation tests; edit-mode prefill was left to manual verification (3.5), missing automated coverage of prop-wiring.
- **Fix**: Add rendering test cases to Phase 3 NpcForm contract: create mode renders all fields; edit mode pre-fills from the `npc` prop.
- **Decision**: FIXED — added rendering test contract to Phase 3 NpcForm unit tests.

### F3 — "Optionally" language on new.astro campaign ownership pre-check

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 4 — New NPC page contract
- **Detail**: "Optionally verify the campaign is owned via an RLS-scoped .maybeSingle()." If omitted, navigating to /campaigns/<foreign-id>/npcs/new renders the form then returns a 404 on submit, inconsistent with every other protected page in the app.
- **Fix**: Remove "Optionally" — make the campaign ownership pre-check mandatory for new.astro.
- **Decision**: FIXED — made campaign ownership pre-check mandatory in Phase 4 new.astro contract.
