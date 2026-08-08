# NPC WFRP4e Stat Block — Plan Brief

> Full plan: `context/changes/npc-wfrp4e-stat-block/plan.md`

## What & Why

Extend the NPC entity with an optional Warhammer Fantasy Roleplay 4th Edition stat block — Attributes, Creature Traits, Skills & Talents — sourced from a Bestiary catalog. Today's NPC model (name/role/free-text traits) covers narrative flavor but has no mechanical representation a GM can actually use at the table. This is the first implementation slice of that PRD (`context/foundation/prd-v2.md`), covering FR-012–FR-019 and the non-regression guarantees FR-022–FR-023.

## Starting Point

NPCs today have `name`, `role`, and free-text `traits`, persisted via a straightforward Zod-validated REST API and edited through `NpcForm`. That flow is proven (campaigns-crud/npc-crud precedent) and stays exactly as-is for any NPC that doesn't touch the new section. No shared/reference-data table exists yet — every table today is per-user RLS-scoped.

## Desired End State

A GM opens the NPC form, searches for a creature type across all 6 Bestiary categories (e.g. "Wampir"), gets an auto-filled editable stat table, tweaks it or accepts it as-is, watches Żywotność recalculate live as they edit Siła/Wytrzymałość/Siła Woli, and saves. The full block then displays on the NPC's detail page. An NPC that never opens this section behaves identically to today.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Attribute storage | Single JSONB column on `npcs` | No FR needs SQL-level querying by attribute; matches "whole block persists alongside existing fields." |
| Creature Traits / Skills-Talents storage | Dictionary tables (`creature_traits`, `skills_talents`) + JSONB assignment arrays referencing them by ID | User explicitly required dictionary-driven values, not hardcoded/free text. |
| Catalog modeling | One `creature_types` table, `category` as a checked text column (not a separate table) | 6 fixed categories don't need normalization; avoids a pointless join. |
| Catalog seed scope | Full lists the user supplied (~90 traits, ~48 creature types) | User transcribed and provided the complete content directly. |
| Skills/Talents seed scope | Structure ready now, minimal illustrative content; full list is a later data-only pass | Official list wasn't available yet; the table shape doesn't need to change later. |
| UI placement | New section inside the existing `NpcForm` | One save, one profile — matches "fast, on-the-fly creation" guardrail. |
| Type re-selection after edits | Confirm-before-overwrite modal | Explicit protection against silently losing manual edits (FR-014). |
| Derived-stat override | Explicit unlock affordance, not implicit dirty-detection | Jawny, visible state beats a GM guessing whether a field is "live" or "frozen." |
| Attribute bounds | 0–100, validated at the API boundary, blocking save | Matches existing Zod-at-the-boundary convention; standard WFRP4e percentage range. |
| Testing approach | Unit tests for components + a pure, data-driven test of the Żywotność formula; manual API verification | Matches established repo precedent; the one non-obvious formula gets real automated proof. |
| Timeline | No fixed estimate — user explicitly deprioritized speed for this change | Full catalog completeness and mechanic correctness took priority over a tight timebox. |

## Scope

**In scope:**
- Creature category/type search and selection, auto-fill with edit protection
- Editable 12-Attribute grid with bounded validation
- Żywotność auto-calculation with explicit manual override
- Creature Traits (standard + individually added) and Skills & Talents, both dictionary-driven
- Full stat block persisted and displayed on the NPC detail page
- Non-regression for existing NPCs and the AI reaction flow

**Out of scope:**
- Equipment (FR-020) and AI reaction enrichment (FR-021) — both nice-to-have, deferred
- Full official Skills/Talents dictionary (structure ships now, content later)
- Catalog editor UI, in-app combat/dice resolution, Career/Profession progression — all explicit PRD non-goals

## Architecture / Approach

Six phases: schema → seed data → API → derived-stat pure function (built and proven in isolation) → UI (built on top of a working, tested backend) → detail-page display + full non-regression pass. The Bestiary catalog is modeled as new-pattern shared reference data (public-read, no per-user ownership) — distinct from every existing per-user RLS table in this codebase. The WFRP fields live directly on `npcs` as nullable JSONB columns rather than a separate table, since they're always read/written together with their NPC.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database Schema | Reference tables + new nullable `npcs` columns, RLS | First public-read RLS pattern in this codebase — get the policy shape right |
| 2. Seed Data | `supabase/seed.sql` populated from the two source lists | Manual transcription of ~140 entries — verify against source, not just "it runs" |
| 3. Types & API Routes | Catalog endpoints + extended NPC validation | None significant — follows the established Zod-at-boundary pattern |
| 4. Derived-Stat Calculation | Pure `computeZyw` function, data-driven tests | The size-multiplier table isn't fully confirmed from memory — must be empirically validated against seed data, with exceptions documented |
| 5. React Components | The full stat-block editor inside `NpcForm` | Largest phase — 7 new components; confirm-overwrite and override-unlock UX are the two genuinely new interaction patterns |
| 6. Detail Display + Non-Regression | Read view + full regression pass | Must prove zero behavior change for existing NPCs and the AI reaction flow, not just "new stuff works" |

**Prerequisites:** None beyond what's already in the repo — Supabase local stack running for migration/seed verification.
**Estimated effort:** Not time-boxed by design (see Key Decisions) — expect this to be the largest slice in the initiative given the new RLS pattern, the derived-stat logic, and 7 new UI components.

## Open Risks & Assumptions

- The Żywotność size-multiplier table is only partially confirmed (Duży ×2, Wielki ×4, no-size-trait ×1); Phase 4 must empirically validate the rest against the full seed set and explicitly document any entries (Niziołki is a known candidate) that don't fit a clean multiplier.
- The two source files (`creature-traits-source.md`, `creature-types-source.md`) are the sole source of truth for Phase 2's seed content — any transcription gaps from the original rulebook carry through to the app.
- No Dialog/modal primitive exists in this codebase yet; Phase 5 installs one via shadcn as new infrastructure.

## Success Criteria (Summary)

- A GM can build a full WFRP4e stat block for an NPC via category→type search→auto-fill→edit→save, with Żywotność staying correct throughout.
- Every existing NPC flow (name/role/traits CRUD, AI reaction) is provably unchanged for NPCs that don't use the new section.
- The derived-stat formula is proven correct against real Bestiary data, not just plausible-looking code.
