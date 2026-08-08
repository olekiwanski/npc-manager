# NPC WFRP4e Stat Block Implementation Plan

## Overview

Extend the NPC entity with an optional Warhammer Fantasy Roleplay 4th Edition mechanical stat block: a GM picks a creature category and type from a Bestiary catalog, gets an editable table (12 Attributes + Creature Traits) auto-filled from that type's defaults, edits or accepts it, and the derived stat (Żywotność) recalculates live as dependent Attributes change. This is the first implementation slice of the WFRP4e initiative (`context/foundation/prd-v2.md`), covering FR-012–FR-019 and the non-regression guarantees FR-022–FR-023. FR-020 (Equipment) and FR-021 (AI reaction enrichment) are nice-to-have and explicitly deferred.

## Current State Analysis

- **NPC model today**: `name`, `role` (free text), `traits` (free text personality, ≤2000 chars) — see `src/types.ts:28-37`, `supabase/migrations/20260604010000_create_npcs.sql`. No mechanical/statistical representation exists.
- **Existing CRUD pattern**: migration → `src/types.ts` → Zod-validated API routes (`src/pages/api/npcs/{index,[id]}.ts`) → React islands (`NpcForm`, `NpcCard`) → Astro SSR pages. Every existing table is per-user, RLS-scoped (`user_id = auth.uid()`). See `context/archive/2026-06-04-npc-crud/plan.md` for the full precedent this plan mirrors.
- **No shared/reference-data table exists yet.** The Bestiary catalog (categories, creature types, the Creature Traits dictionary) is the first genuinely public-read, non-per-user data this codebase will hold.
- **No modal/dialog UI primitive is installed.** `src/components/ui/` has only `button.tsx` (shadcn) and `LibBadge.astro`; `@radix-ui/react-dialog` is not a dependency yet.
- **Seed data convention exists but is unused**: `supabase/config.toml` already has `db.seed.enabled = true` pointing at `supabase/seed.sql`, but that file doesn't exist yet — this is the correct, already-configured place for catalog content, separate from schema migrations.
- **Content is in hand**: the user supplied the full Creature Traits dictionary (~90 entries, `context/changes/npc-wfrp4e-stat-block/creature-traits-source.md`) and the full creature-types list with attribute lines (~48 entries across all 6 categories, `context/changes/npc-wfrp4e-stat-block/creature-types-source.md`), both transcribed from the WFRP4e core rulebook.

## Desired End State

A GM editing an NPC (create or edit) sees an optional "WFRP4e Stats" section in the existing NPC form. They search across all 6 Bestiary categories for a creature type (e.g. "Wampir"); selecting one auto-fills 12 Attributes and that type's standard Creature Traits. Every value is editable; accepting defaults without touching anything is a valid path. Żywotność recalculates live as the GM edits Siła, Wytrzymałość, or Siła Woli — unless the GM has explicitly unlocked it for manual entry. The GM can add extra Creature Traits and Skills/Talents from a searchable dictionary beyond the type's defaults. Re-selecting a different type after making manual edits prompts a confirm-before-overwrite dialog; re-selecting before touching anything applies silently. Saving persists the full block. NPCs that never touch any of this continue to work exactly as before — form, card, detail page, and the AI reaction flow are all unaffected when the WFRP fields are absent.

Verification: create an NPC, add a full WFRP4e stat block via the catalog, edit an Attribute and watch Żywotność update, save, reload the detail page and see the persisted block; separately, confirm an old-style name/role/traits-only NPC still creates, edits, and gets an AI reaction with no behavior change.

### Key Discoveries:

- `.maybeSingle()` + `.select()` after a mutation is the established pattern for observing whether RLS silently rejected a write (`src/pages/api/npcs/[id].ts:46`) — the new WFRP fields ride the same `PATCH`/`POST` handlers, so no new ownership-check pattern is needed.
- The "Bonus" WFRP4e concept (used throughout the Creature Traits dictionary, e.g. "4 + Bonus z Siły") is `floor(characteristic / 10)` — confirmed directly from the source material, not assumed.
- Cross-checking the seed data itself against a guessed Żywotność formula (`floor(S/10) + 2×floor(Wt/10) + floor(SW/10)`, then × a size multiplier) confirms `×2` for `Rozmiar (Duży)` (verified against both Trolle and Ogry independently) and `×4` for `Rozmiar (Wielki)` (verified against Smoki), with `×1` for no size trait (verified against Ludzie) — but at least one entry (Niziołki / `Rozmiar (Mały)`) does **not** fit this pattern cleanly. This means the formula/multiplier table must be empirically validated against the full seeded dataset during implementation, not trusted from a single guess — see Phase 4.

## What We're NOT Doing

- **No Equipment (FR-020)** — nice-to-have, deferred to a follow-up change.
- **No AI reaction enrichment (FR-021)** — nice-to-have, deferred; `src/lib/npc-reaction.ts` is not touched in this slice.
- **No full official catalog population beyond the supplied lists.** Creature types with "brak szczegółowych statystyk" in the source (Dziki, Psy, Olbrzymie pająki, Konie, Bestie bagienne, Kultyści) are skipped — no fabricated stat lines.
- **No full official Skills/Talents dictionary.** Seeded with a handful of illustrative entries only (per the user's own decision); the full list is a follow-up content pass, using the same table structure so no future migration is needed — only more `INSERT`s.
- **No catalog editor UI.** Categories, creature types, and dictionary entries are seeded via `supabase/seed.sql`; there is no user-facing (or GM-facing) create/edit/delete surface for them — consistent with the PRD non-goal.
- **No in-app combat/dice resolution.** The stat block is data for use at the physical table; nothing here resolves tests, rolls, or initiative.
- **No data migration/backfill for existing NPCs.** Existing rows simply get `null`/empty defaults for the new columns.
- **No changes to Access Control.** New tables inherit the existing auth model; no new roles.
- **No automated API integration tests**, matching the established precedent (`context/archive/2026-06-04-npc-crud/plan.md` §What We're NOT Doing) — component unit tests plus a data-driven test of the derived-stat formula, manual verification for the API surface.

## Implementation Approach

Six phases, ordered so nothing is built on an untested foundation: schema first (nothing works without it), then the seed data that makes the schema meaningful, then the API contract, then the one genuinely non-obvious piece of business logic (derived-stat calculation) in isolation as a pure function, then the UI that consumes all of the above, then the read-side display plus a full non-regression pass.

The Bestiary catalog (`creature_types`, `creature_traits`, `skills_talents`) is modeled as shared, public-read reference data — a new pattern in this codebase, distinct from every existing per-user RLS-scoped table. `npcs` gains new nullable columns rather than a separate table, since the WFRP block is 1:1 with its NPC and is always read/written together with it (no independent query pattern needs it split out).

## Critical Implementation Details

**Public-read reference tables are a new RLS pattern.** Every existing table in this codebase uses `auth.uid() = user_id` policies. `creature_types`, `creature_traits`, and `skills_talents` have no owner — they enable RLS but expose exactly one policy each: `SELECT` for the `authenticated` role using `true`. No `INSERT`/`UPDATE`/`DELETE` policies exist for any role but the table owner (migrations), which is what makes "no catalog editor" structurally true rather than just a UI omission.

**Confirm-before-overwrite is a dirty-state check, not a mode check.** Selecting a creature type applies its defaults immediately and silently if the GM hasn't touched any WFRP field yet (true on first selection in create mode, or immediately after a prior silent/confirmed apply). If any field has been edited since the last applied template, re-selecting a type shows a confirm dialog naming what will be replaced. On confirm, standard-source traits are replaced by the new type's defaults, but any individually-added (`source: 'custom'`) traits and skills/talents are preserved — they aren't part of what "the type" provides, so a type change doesn't touch them. `wfrp_zyw_overridden` resets to `false` on confirmed overwrite (the new type's default Żywotność takes over).

**Manual override of Żywotność is an explicit unlock, not implicit dirty-detection.** The field renders read-only by default (auto-calculated); a small unlock affordance makes it editable and sets `wfrp_zyw_overridden = true` on the NPC, after which edits to Siła/Wytrzymałość/Siła Woli stop recalculating it until the GM re-locks it (clearing the override flag and recalculating fresh).

**The Żywotność formula needs empirical validation against the seed data, not a single asserted table.** Base formula: `floor(S/10) + 2×floor(Wt/10) + floor(SW/10)`, then multiplied by a size factor keyed off the NPC's `Rozmiar` trait value (if present). Cross-checking this plan's own research against `creature-types-source.md` confirms `×2` for Duży and `×4` for Wielki, `×1` for no size trait — but Niziołki (Mały) doesn't fit. Phase 4 must validate the formula against every seeded entry with a known Żyw as data-driven test cases, and document any confirmed exceptions in code rather than silently forcing a mismatched multiplier.

**No Dialog primitive is installed yet.** Phase 5 needs `npx shadcn@latest add dialog` (or `alert-dialog`, whichever the shadcn "new-york" style offers as the confirm-style primitive) before the confirm-overwrite UI can be built — this is new infrastructure for the project, not a reuse of an existing component.

---

## Phase 1: Database Schema

### Overview

Create the three shared reference tables and extend `npcs` with the new optional WFRP columns. This unblocks every later phase. Apply locally with `npx supabase db reset` before Phase 2.

### Changes Required:

#### 1. Supabase migration file

**File**: `supabase/migrations/20260808000000_create_wfrp_stat_block.sql` (create)

**Intent**: Add the Bestiary catalog as public-read reference data, and extend `npcs` with nullable columns for the optional WFRP stat block, keeping every existing NPC and every existing RLS guarantee unchanged.

**Contract**:
- `creature_traits` — `id` (uuid pk, default `gen_random_uuid()`), `name` (text, not null, unique), `description` (text, not null), `takes_value` (boolean, not null, default `false`), `created_at` (timestamptz, not null, default `now()`). RLS enabled; single policy `creature_traits_select_all` — `SELECT` for `authenticated` `USING (true)`.
- `skills_talents` — `id` (uuid pk), `name` (text, not null, unique), `kind` (text, not null, `check (kind in ('skill', 'talent'))`), `description` (text, not null), `takes_value` (boolean, not null, default `false`), `created_at` (timestamptz, not null, default `now()`). RLS enabled; single `SELECT`-for-`authenticated` policy, same shape as above.
- `creature_types` — `id` (uuid pk), `category` (text, not null, `check` against the 6 PRD categories: `'ludy_reiklandu'`, `'zwierzyniec_reiklandu'`, `'potworne_bestie_reiklandu'`, `'hordy_zielonoskorych'`, `'niespokojni_umarli'`, `'niewolnicy_ciemnosci'`), `subcategory` (text, nullable — only populated for `niewolnicy_ciemnosci`'s four subgroups), `name` (text, not null, unique), `default_attributes` (jsonb, not null — shape `{sz, ww, us, s, wt, i, zw, zr, int, sw, ogd, zyw}`, all integers), `default_traits` (jsonb, not null, default `'[]'` — array of `{trait_id, value}`), `suggested_traits` (jsonb, not null, default `'[]'` — same shape, informational only), `created_at` (timestamptz, not null, default `now()`). RLS enabled; single `SELECT`-for-`authenticated` policy. Index `creature_types_category_idx` on `(category)` for the category-filtered search.
- `npcs` gains (via `alter table`): `wfrp_creature_type_id` (uuid, nullable, `references creature_types(id) on delete set null`), `wfrp_attributes` (jsonb, nullable — same shape as `creature_types.default_attributes`; `null` means "no stat block"), `wfrp_traits` (jsonb, not null, default `'[]'` — array of `{trait_id, value, source}` where `source` is `'template' | 'custom'`), `wfrp_skills_talents` (jsonb, not null, default `'[]'` — array of `{id, value}` referencing `skills_talents.id`), `wfrp_zyw_overridden` (boolean, not null, default `false`). No RLS policy changes needed on `npcs` — the existing four per-operation policies already gate the entire row by `user_id`, and these are just new nullable columns on that same row.

### Success Criteria:

#### Automated Verification:

- Migration file exists at `supabase/migrations/20260808000000_create_wfrp_stat_block.sql`
- `npx supabase db reset` completes without error

#### Manual Verification:

- Supabase Studio shows `creature_traits`, `skills_talents`, `creature_types` with all columns and the category index
- RLS is enabled on all three new tables with exactly one `SELECT` policy each; attempting an `INSERT` as an authenticated non-service-role user is rejected
- `npcs` shows the five new columns, all nullable/defaulted; an existing NPC row (or a freshly inserted name-only NPC) has `wfrp_attributes = null`, `wfrp_traits = []`, `wfrp_skills_talents = []`, `wfrp_zyw_overridden = false` without any migration error
- Deleting a `creature_types` row (manually, as a test) sets `wfrp_creature_type_id` to `null` on any NPC that referenced it, rather than failing or cascading

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Seed Data

### Overview

Populate `supabase/seed.sql` with the Creature Traits dictionary, a minimal Skills/Talents starter set, and the full creature-types catalog, using `context/changes/npc-wfrp4e-stat-block/creature-traits-source.md` and `creature-types-source.md` as the authoritative content. This phase is pure data entry, independently verifiable from the schema.

### Changes Required:

#### 1. Seed script

**File**: `supabase/seed.sql` (create)

**Intent**: Load the full reference dataset so the catalog is immediately usable after `npx supabase db reset`, matching the project's existing (but previously unused) `db.seed` convention.

**Contract**: One `insert into creature_traits (name, description, takes_value) values (...)` statement (or a `values` list) per entry in `creature-traits-source.md` (~90 rows, plus the handful of additional trait names `creature-types-source.md`'s implementer notes call out as needing dictionary entries: Kwasowa Krew, Wymiot, Pazury, Odporność na Magię, Jad, Latanie, Mutant). Then `insert into skills_talents (...)` with a small illustrative set (e.g. a few Basic Skills and a few Talents, per the WFRP template's own examples — "Unik, Percepcja, Zastraszanie" / "Bardzo Silny, Oburęczność, Twardziel" — enough to exercise the picker UI, not the full official list). Then `insert into creature_types (...)` for every entry in `creature-types-source.md` that has an attribute line (skip entries marked "brak szczegółowych statystyk"), resolving each `Cechy`/`Opcjonalne` trait name to its `creature_traits.id` via a `name`-keyed subquery or CTE so `default_traits`/`suggested_traits` store `trait_id`, not the name string. Parameterized traits (e.g. `Broń +7`, `Pancerz (2)`, `Rozmiar (Duży)`) carry their parenthetical/numeric portion as the assignment's `value`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` completes without error (seed runs after migrations)
- A row count check (`select count(*) from creature_traits`, `creature_types`) returns the expected totals matching the source files

#### Manual Verification:

- Supabase Studio shows all ~90+ Creature Traits with correct name/description/`takes_value`
- Spot-check 3–4 `creature_types` rows (e.g. Wampiry, Trolle, Ludzie) against the source file — attributes and resolved trait references match exactly
- No orphaned trait references (every `trait_id` in every `creature_types.default_traits`/`suggested_traits` resolves to a real `creature_traits.id`)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Types & API Routes

### Overview

Extend `src/types.ts` with the new entities and DTOs, add read endpoints for the catalog/dictionaries, and extend the existing NPC create/update endpoints to accept the optional WFRP fields.

### Changes Required:

#### 1. WFRP types

**File**: `src/types.ts` (edit — append)

**Intent**: Define the catalog/dictionary entities and extend the `Npc` entity and its DTOs with the optional WFRP fields.

**Contract**:
- `WfrpAttributes` — `{ sz: number; ww: number; us: number; s: number; wt: number; i: number; zw: number; zr: number; int: number; sw: number; ogd: number; zyw: number; }`.
- `CreatureTrait` — `{ id: string; name: string; description: string; takes_value: boolean; }`.
- `SkillTalent` — `{ id: string; name: string; kind: "skill" | "talent"; description: string; takes_value: boolean; }`.
- `WfrpTraitAssignment` — `{ trait_id: string; value: string | null; source: "template" | "custom"; }`.
- `WfrpSkillTalentAssignment` — `{ id: string; value: string | null; }`.
- `CreatureType` — `{ id: string; category: string; subcategory: string | null; name: string; default_attributes: WfrpAttributes; default_traits: WfrpTraitAssignment[]; suggested_traits: WfrpTraitAssignment[]; }`.
- `Npc` gains: `wfrp_creature_type_id: string | null; wfrp_attributes: WfrpAttributes | null; wfrp_traits: WfrpTraitAssignment[]; wfrp_skills_talents: WfrpSkillTalentAssignment[]; wfrp_zyw_overridden: boolean;`.
- `CreateNpcDto`/`UpdateNpcDto` gain the same five fields, all optional/nullish, matching the existing `role`/`traits` nullish pattern.

#### 2. Catalog read endpoints

**File**: `src/pages/api/creature-types/index.ts` (create)

**Intent**: Power the category+type search (FR-012/FR-013). Read-only; no create/update/delete — the catalog has no user-facing write path.

**Contract**: `export const prerender = false`. `GET` handler — optional `category` and `q` (name search, case-insensitive `ilike`) query params; returns `200 { data: CreatureType[] }`. `401` if unauthenticated (RLS would return an empty set for an anonymous request anyway, but the explicit check matches every other route's convention).

**File**: `src/pages/api/creature-traits/index.ts` (create)

**Intent**: Power the "add trait" picker (FR-017).

**Contract**: `export const prerender = false`. `GET` handler — optional `q` search param; returns `200 { data: CreatureTrait[] }`. `401` if unauthenticated.

**File**: `src/pages/api/skills-talents/index.ts` (create)

**Intent**: Power the Skills & Talents picker (FR-018).

**Contract**: `export const prerender = false`. `GET` handler — optional `q` and `kind` (`skill`/`talent`) params; returns `200 { data: SkillTalent[] }`. `401` if unauthenticated.

#### 3. Extend NPC create/update validation

**File**: `src/pages/api/npcs/index.ts` (edit)

**Intent**: Accept the optional WFRP block on NPC creation, validated the same way `name`/`role`/`traits` already are.

**Contract**: Extend `createSchema` with `wfrp_creature_type_id` (uuid, nullish), `wfrp_attributes` (nullish object of 12 fields, each `z.number().int().min(0).max(100)`), `wfrp_traits` (nullish array of `{ trait_id: z.uuid(), value: z.string().max(200).nullish(), source: z.enum(["template", "custom"]) }`), `wfrp_skills_talents` (nullish array of `{ id: z.uuid(), value: z.string().max(200).nullish() }`), `wfrp_zyw_overridden` (`z.boolean().nullish()`). Pass through to the `insert` alongside the existing fields.

**File**: `src/pages/api/npcs/[id].ts` (edit)

**Intent**: Accept the same optional WFRP block on update.

**Contract**: Mirror the same five fields (all fully optional, since `updateSchema`'s existing fields are too) into `updateSchema`; pass through to `update`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new/changed files
- `npm run build` emits no TypeScript errors

#### Manual Verification:

- `GET /api/creature-types?category=niespokojni_umarli` returns only that category's entries; `?q=wamp` returns Wampiry
- `GET /api/creature-traits?q=pancerz` returns the Pancerz entry
- `POST /api/npcs` with a full WFRP block (valid `wfrp_creature_type_id`, in-range `wfrp_attributes`) returns `201` with the block persisted
- `POST /api/npcs` with an attribute value of `150` returns `400`
- `PATCH /api/npcs/<id>` with only `{ wfrp_zyw_overridden: true }` updates just that flag, leaving other WFRP fields untouched
- An NPC created with no WFRP fields at all (today's existing flow) still returns `201` exactly as before

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Derived-Stat Calculation

### Overview

Implement the Żywotność formula as a pure, independently-tested function, validated against the full seeded dataset — this is the one piece of genuinely non-obvious business logic in this slice, and it's built and proven correct before any UI depends on it.

### Changes Required:

#### 1. Derived-stat function

**File**: `src/lib/wfrp-derived-stats.ts` (create)

**Intent**: Compute Żywotność from Siła, Wytrzymałość, and Siła Woli, adjusted by a size multiplier resolved from the NPC's `Rozmiar` trait (if any).

**Contract**: `computeZyw(attributes: Pick<WfrpAttributes, "s" | "wt" | "sw">, traits: WfrpTraitAssignment[], traitsById: Map<string, CreatureTrait>): number`. Base value is `floor(s/10) + 2×floor(wt/10) + floor(sw/10)`. Multiplier is looked up from the `Rozmiar` trait's assigned value, if the NPC has one; the exact size→multiplier table must be derived empirically per the Critical Implementation Details above (`×2` for Duży and `×4` for Wielki are confirmed; every other size value needs verification against `creature-types-source.md`, and any entry that doesn't fit the resulting table — Niziołki is a known candidate — gets a code comment documenting it as a confirmed exception, not silently forced to match).

#### 2. Derived-stat unit tests

**File**: `src/lib/wfrp-derived-stats.test.ts` (create)

**Intent**: Prove the formula against real data, not synthetic examples.

**Contract**: Data-driven test iterating every seeded `creature_types` entry that has a `Rozmiar` trait plus a representative sample without one (e.g. Ludzie, Klanbracia), asserting `computeZyw(...)` matches that entry's known `default_attributes.zyw`. Document (via a `test.skip` with a comment, or an explicit assertion of the confirmed exception) any entry where the formula's output diverges from the source data, rather than silently excluding it from the test set.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` emits no TypeScript errors
- `npm run test` — `wfrp-derived-stats.test.ts` passes, with every seeded entry either matching or explicitly documented as a known exception

#### Manual Verification:

- Manually recompute Żywotność for 2–3 creature types by hand and confirm the function's output matches

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: React Components — Stat Block Editor

### Overview

Build the interactive stat-block editor as a new section inside the existing `NpcForm`, composed of focused sub-components, plus their unit tests. This is the largest UI phase — it's where FR-012 through FR-018 become something a GM can actually use.

### Changes Required:

#### 1. Dialog primitive

**Intent**: Install the confirm-before-overwrite modal's underlying primitive.

**Contract**: `npx shadcn@latest add dialog` (or `alert-dialog`, whichever the "new-york" style registry offers as the confirm-action variant) — lands in `src/components/ui/`, following the existing `button.tsx` precedent.

#### 2. Creature type search/select

**File**: `src/components/npcs/CreatureTypeSelect.tsx` (create)

**Intent**: Let the GM find a creature type by name across all 6 categories in a single search, with category shown as a grouping label (FR-012/FR-013).

**Contract**:
```typescript
interface CreatureTypeSelectProps {
  value: string | null; // selected creature_type id
  onSelect: (type: CreatureType) => void;
}
```
Debounced search against `GET /api/creature-types?q=`, grouped by `category` in the results list. Selecting an option calls `onSelect` with the full `CreatureType` (attributes + default traits included) so the parent doesn't need a second fetch.

#### 3. Confirm-overwrite dialog

**File**: `src/components/npcs/ConfirmOverwriteDialog.tsx` (create)

**Intent**: Gate a type re-selection that would discard manually-edited values (FR-014).

**Contract**:
```typescript
interface ConfirmOverwriteDialogProps {
  open: boolean;
  newTypeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```
Built on the Dialog primitive from item 1. Message names the incoming type and states that manually-edited Attributes/Traits/Skills will be replaced by its defaults (custom-added traits/skills are preserved — say so explicitly, so the GM isn't surprised either way).

#### 4. Attributes grid

**File**: `src/components/npcs/WfrpAttributesGrid.tsx` (create)

**Intent**: Editable grid for the 12 Attributes, with Żywotność auto-calculated and lockable (FR-015/FR-016).

**Contract**:
```typescript
interface WfrpAttributesGridProps {
  attributes: WfrpAttributes;
  traits: WfrpTraitAssignment[];
  traitsById: Map<string, CreatureTrait>;
  zywOverridden: boolean;
  onChange: (attributes: WfrpAttributes) => void;
  onZywOverrideChange: (overridden: boolean) => void;
}
```
11 numeric inputs (all but Żyw), each bounded 0–100 client-side (matching the API's Zod bounds) with an inline error on out-of-range entry. Żyw renders read-only with an unlock affordance; while locked, it's recomputed via `computeZyw` (Phase 4) on every change to `s`/`wt`/`sw` or to the `Rozmiar` trait; unlocking makes it a normal input and calls `onZywOverrideChange(true)`.

#### 5. Traits list

**File**: `src/components/npcs/WfrpTraitsList.tsx` (create)

**Intent**: Show current traits (visually distinguishing template-sourced from individually-added) and let the GM add more from the dictionary (FR-017).

**Contract**:
```typescript
interface WfrpTraitsListProps {
  traits: WfrpTraitAssignment[];
  onChange: (traits: WfrpTraitAssignment[]) => void;
}
```
Each trait shows name + (if `takes_value`) an editable value field + description on hover/expand. `source: "template"` entries show a badge and no remove button; `source: "custom"` entries are removable. An "add trait" control searches `GET /api/creature-traits?q=` and appends a new `{ trait_id, value: null, source: "custom" }`.

#### 6. Skills & Talents list

**File**: `src/components/npcs/WfrpSkillsTalentsList.tsx` (create)

**Intent**: Same pattern as traits, simpler since there's no template/custom distinction yet (FR-018).

**Contract**:
```typescript
interface WfrpSkillsTalentsListProps {
  entries: WfrpSkillTalentAssignment[];
  onChange: (entries: WfrpSkillTalentAssignment[]) => void;
}
```
Searches `GET /api/skills-talents?q=`, groups results by `kind` in the picker. Every entry is removable (no defaults to protect against).

#### 7. Stats section orchestration + NpcForm integration

**File**: `src/components/npcs/WfrpStatsSection.tsx` (create)

**Intent**: Own the combined WFRP local state (attributes, traits, skills/talents, `wfrp_creature_type_id`, `wfrp_zyw_overridden`), wire the type-select → confirm-dialog → apply-defaults flow, and render the sub-components as one collapsible section.

**Contract**:
```typescript
interface WfrpStatsSectionProps {
  npc?: Npc; // undefined = create mode, seeds initial state from npc.wfrp_* when present
  onChange: (block: WfrpStateBlock) => void; // lifts the combined state up to NpcForm
}
```
Tracks a `touched` flag (any field edited since the last applied template). Selecting a creature type: if `!touched`, apply immediately; if `touched`, open `ConfirmOverwriteDialog` and apply only on confirm. Applying sets attributes/`default_traits`(as `source: "template"`)/`wfrp_creature_type_id` from the selected type, preserves any `source: "custom"` traits and all skills/talents, resets `wfrp_zyw_overridden` to `false`, and resets `touched` to `false`.

**File**: `src/components/npcs/NpcForm.tsx` (edit)

**Intent**: Add the WFRP block as an optional section beneath the existing name/role/traits fields, without changing their behavior.

**Contract**: Render `<WfrpStatsSection npc={npc} onChange={setWfrpBlock} />` after the existing `traits` field. On submit, spread the five WFRP fields into the existing payload only when a creature type has been selected or attributes exist (i.e. omit them entirely — not send `null` — for NPCs that never touched this section, preserving the exact current payload shape for the common case).

#### 8. Component unit tests

**Files**: `src/components/npcs/{WfrpAttributesGrid,WfrpTraitsList,WfrpSkillsTalentsList,ConfirmOverwriteDialog,WfrpStatsSection}.test.tsx` (create)

**Intent**: Cover the logic that isn't already covered by Phase 4's pure-function tests.

**Contract**: `WfrpAttributesGrid` — out-of-range input shows an inline error and does not call `onChange` with the invalid value; Żyw is read-only when `zywOverridden` is `false` and editable when `true`; unlocking calls `onZywOverrideChange(true)`. `WfrpTraitsList` — template-sourced traits have no remove button, custom ones do; adding a trait from the picker appends with `source: "custom"`. `WfrpStatsSection` — selecting a type with `touched = false` applies immediately (dialog never opens); selecting a type with `touched = true` opens the dialog and only applies on confirm; confirming preserves existing custom traits/skills.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new/changed files
- `npm run build` emits no TypeScript errors
- `npm run test` — all new component tests pass

#### Manual Verification:

- Searching the creature type field finds entries across categories (e.g. typing "wamp" finds Wampiry under Niespokojni Umarli)
- Selecting a type on a pristine form auto-fills all 12 Attributes and standard traits with no dialog
- Editing an Attribute, then selecting a different type, shows the confirm dialog; canceling leaves the edit intact; confirming replaces attributes/standard traits but keeps any custom-added trait
- Editing Siła updates Żywotność live with no page reload; unlocking Żyw makes it directly editable and further Siła edits no longer change it
- Adding a trait/skill from the picker appends it; removing a custom trait works; a template trait has no remove control
- Saving an NPC with no WFRP section touched behaves exactly as before this change (payload unchanged)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: NPC Detail Page Display + Non-Regression

### Overview

Render the persisted stat block on the read-only NPC detail page (a GM can't use it at the table if it only exists inside an edit form), then run a full pass confirming every non-regression guarantee from the PRD holds.

### Changes Required:

#### 1. Detail page stat block display

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro` (edit)

**Intent**: Show the WFRP block (when present) alongside the existing name/role/traits read view.

**Contract**: When `npc.wfrp_attributes` is not null, render a read-only 12-value attribute table, the creature type name (resolved via a join/lookup on `wfrp_creature_type_id`, if set), and the traits/skills-talents lists (name + value + description), fetched in the same SSR frontmatter query as the NPC itself. When `wfrp_attributes` is null, render nothing extra — the page looks exactly as it does today.

### Success Criteria:

#### Automated Verification:

- `npm run build` completes with no errors
- `npm run lint` passes across all changed files
- `npm run test` — full suite passes, including every test from Phases 4 and 5

#### Manual Verification:

- NPC detail page shows the full stat block for an NPC that has one, and shows nothing extra for one that doesn't
- Full create-with-stats flow end-to-end: new NPC → pick category/type → auto-fill → edit an attribute → add a custom trait → save → detail page shows everything correctly
- An NPC created via the pre-existing flow (name/role/traits only, WFRP section never opened) creates, edits, and deletes exactly as before this change
- The AI reaction flow (`/campaigns/[id]/npcs/[npcId]` → submit a scenario) still produces a response for both a stats-NPC and a no-stats NPC, with no observable change in behavior from before this change (FR-021 enrichment is explicitly out of scope — the prompt is unchanged)
- Cross-account isolation: user B cannot read user A's NPC's WFRP data (existing per-NPC RLS already covers this — verify it wasn't accidentally weakened)
- Two-click delete, campaign cascade-delete, and the campaign/NPC list pages all behave exactly as before this change

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `computeZyw` — data-driven against every seeded creature type with a known `zyw`, plus documented exceptions (Phase 4).
- `WfrpAttributesGrid` — bounds validation, Żyw lock/unlock behavior (Phase 5).
- `WfrpTraitsList` — template-vs-custom remove affordance, add-from-picker behavior (Phase 5).
- `WfrpStatsSection` — touched-state gating of the confirm dialog, custom-trait preservation on confirmed overwrite (Phase 5).

### Integration Tests:

- (Manual) Catalog endpoints — category filter, name search, unauthenticated 401 (Phase 3).
- (Manual) NPC create/update with a full WFRP block, and with an out-of-range attribute rejected (Phase 3).

### Manual Testing Steps:

1. Create an NPC, open the WFRP section, search and select a creature type (e.g. Wampir); confirm all 12 Attributes and standard traits auto-fill.
2. Edit Siła; confirm Żywotność updates live.
3. Unlock Żywotność, set a custom value, edit Siła again; confirm Żywotność no longer changes.
4. Add a custom trait and a skill/talent from their pickers.
5. Select a different creature type; confirm the overwrite dialog appears and names the incoming type; cancel and confirm the prior edits are untouched.
6. Re-select the type and confirm; verify Attributes/standard traits reset to the new type's defaults, the custom trait/skill from step 4 are preserved, and Żywotność's override clears.
7. Save; open the NPC's detail page; confirm the full stat block renders correctly.
8. Create a second NPC touching only name/role/traits; confirm it saves, edits, and deletes with no WFRP section ever opened.
9. Submit an AI reaction query against both NPCs from step 7 and step 8; confirm both still produce an in-character response.
10. In an incognito window as a second account, confirm the first account's NPCs (stats and non-stats) are unreachable.

## Performance Considerations

Small data volume (PRD: `target_scale.data_volume: small`). The catalog is ~50 creature types and ~90+ traits — trivially small for `ilike` search with no index beyond the category index from Phase 1. No pagination or caching needed at this scale.

## Migration Notes

Phase 1 adds the third schema migration (`20260808000000_create_wfrp_stat_block.sql`), after `20260604010000_create_npcs.sql` and `20260604020000_create_npc_has_npc.sql`. Phase 2's `supabase/seed.sql` is new — it's the first time this project's already-configured `db.seed` convention is actually used; `npx supabase db reset` runs it automatically after migrations. Apply the migration to production via `npx supabase db push`; seed data for production needs a one-time manual run of `seed.sql`'s statements (or `npx supabase db push` plus a separate seed application step, per the team's deployment process) since `db push` does not run seeds.

## References

- Change scope: `context/changes/npc-wfrp4e-stat-block/change.md`
- PRD: `context/foundation/prd-v2.md` (FR-012–FR-019, FR-022–FR-023; `## Business Logic Changes`; `## Constraints & Compatibility`)
- Roadmap/initiative branch: `npc-wfrp4e-stats` (parent integration branch)
- Seed content: `context/changes/npc-wfrp4e-stat-block/creature-traits-source.md`, `creature-types-source.md`
- Sibling plan (structural template): `context/archive/2026-06-04-npc-crud/plan.md`
- Migration pattern: `supabase/migrations/20260604010000_create_npcs.sql`
- API pattern: `src/pages/api/npcs/{index,[id]}.ts`
- Existing form to extend: `src/components/npcs/NpcForm.tsx`
- Stack assessment: `context/foundation/stack-assessment.md` (Zod-at-the-boundary pattern confirmed reusable)

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema

#### Automated

- [x] 1.1 Migration file exists at `supabase/migrations/20260808000000_create_wfrp_stat_block.sql`
- [x] 1.2 `npx supabase db reset` completes without error

#### Manual

- [x] 1.3 `creature_traits`, `skills_talents`, `creature_types` visible in Studio with correct columns and the category index
- [x] 1.4 RLS enabled on all three new tables with exactly one SELECT policy each; INSERT rejected for authenticated users
- [x] 1.5 `npcs` shows the five new nullable/defaulted columns; existing/new name-only NPCs unaffected
- [x] 1.6 Deleting a `creature_types` row sets referencing NPCs' `wfrp_creature_type_id` to null

### Phase 2: Seed Data

#### Automated

- [ ] 2.1 `npx supabase db reset` completes without error (seed runs after migrations)
- [ ] 2.2 Row counts in `creature_traits`/`creature_types` match the source files

#### Manual

- [ ] 2.3 All ~90+ Creature Traits visible with correct name/description/takes_value
- [ ] 2.4 Spot-checked creature_types rows (Wampiry, Trolle, Ludzie) match source exactly
- [ ] 2.5 No orphaned trait references in default_traits/suggested_traits

### Phase 3: Types & API Routes

#### Automated

- [ ] 3.1 `npm run lint` passes on all new/changed files
- [ ] 3.2 `npm run build` emits no TypeScript errors

#### Manual

- [ ] 3.3 GET /api/creature-types category filter and search work
- [ ] 3.4 GET /api/creature-traits search works
- [ ] 3.5 POST /api/npcs with a full WFRP block returns 201 with the block persisted
- [ ] 3.6 POST /api/npcs with an out-of-range attribute returns 400
- [ ] 3.7 PATCH /api/npcs/<id> with a single WFRP field updates only that field
- [ ] 3.8 POST /api/npcs with no WFRP fields behaves exactly as before this change

### Phase 4: Derived-Stat Calculation

#### Automated

- [ ] 4.1 `npm run lint` passes
- [ ] 4.2 `npm run build` emits no TypeScript errors
- [ ] 4.3 `npm run test` — wfrp-derived-stats.test.ts passes for all seeded entries or documented exceptions

#### Manual

- [ ] 4.4 Hand-recomputed Żywotność for 2–3 creature types matches the function's output

### Phase 5: React Components — Stat Block Editor

#### Automated

- [ ] 5.1 `npm run lint` passes on all new/changed files
- [ ] 5.2 `npm run build` emits no TypeScript errors
- [ ] 5.3 `npm run test` — all new component tests pass

#### Manual

- [ ] 5.4 Creature type search finds entries across categories
- [ ] 5.5 Selecting a type on a pristine form auto-fills with no dialog
- [ ] 5.6 Editing then re-selecting a type shows the confirm dialog; cancel preserves edits
- [ ] 5.7 Editing Siła updates Żywotność live; unlocking stops auto-recalculation
- [ ] 5.8 Adding/removing custom traits and skills/talents works correctly
- [ ] 5.9 Saving an NPC with no WFRP section touched is unchanged from before this change

### Phase 6: NPC Detail Page Display + Non-Regression

#### Automated

- [ ] 6.1 `npm run build` completes with no errors
- [ ] 6.2 `npm run lint` passes across all changed files
- [ ] 6.3 `npm run test` — full suite passes

#### Manual

- [ ] 6.4 NPC detail page shows the full stat block when present, nothing extra when absent
- [ ] 6.5 Full create-with-stats flow works end-to-end
- [ ] 6.6 Pre-existing name/role/traits-only flow is unaffected
- [ ] 6.7 AI reaction flow still works for both stats and non-stats NPCs
- [ ] 6.8 Cross-account isolation holds for WFRP data
- [ ] 6.9 Delete/cascade and list pages behave exactly as before this change
