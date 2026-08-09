---
project: "NPC Manager"
version: 2
status: draft
created: 2026-08-08
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: null # open — no fixed estimate committed; see Open Questions
  hard_deadline: null
  after_hours_only: true
---

# NPC Manager — WFRP4e NPC Stats

## Current System Overview

- **System purpose:** Web app for solo Game Masters to manage TTRPG NPCs, campaigns, and relationships, with AI-generated in-character reactions.
- **Key architecture:** Astro 6 SSR monolith with React 19 islands, deployed as a Cloudflare Worker; Supabase (Postgres + Auth) as the backing store with per-user Row Level Security.
- **Tech stack:** Astro 6, React 19, Tailwind 4, Supabase (`@supabase/ssr`), Cloudflare Workers, Anthropic API (streamed in-character reaction).
- **Current user base:** Solo GMs; small scale; MVP fully shipped — auth, campaigns CRUD, NPC CRUD, relationships CRUD, streamed AI reaction (all complete).
- **Core functionality today:** An NPC has `name`, `role` (free text, e.g. "Dwarf merchant"), and `traits` (free text personality description, ≤ 2000 chars). `role` and `traits` are injected directly into the AI reaction system prompt — there is no mechanical/statistical representation of an NPC.

## Problem Statement & Motivation

The current NPC model is flat text (role + personality traits) — enough for narrative flavor and AI in-character reactions, but it has no place to hold a mechanical character sheet. A GM running Warhammer Fantasy Roleplay 4th Edition sessions needs to generate usable stat blocks for NPCs and creatures — Attributes, Creature Traits (special rules), Skills/Talents, Equipment — following the game's own Bestiary format, which is explicitly designed for fast "on-the-fly" NPC creation.

This gap is why the change is needed now: the product's differentiator (an NPC-native tool, not a blank canvas) currently only covers the narrative half of "who this NPC is" — not the mechanical half a GM needs to actually run them at the table. Today's workaround is keeping WFRP stat blocks outside the app entirely (paper, a separate doc), which defeats the point of having NPCs live in one place.

## User & Persona

Unchanged from the shipped MVP: **Solo GM** — one person who creates, runs, and maintains their own TTRPG campaign. This change does not introduce a new persona; it deepens what the existing persona can do for NPCs they already manage. Existing NPCs created without any WFRP4e data must continue to work exactly as today — the new capability is additive, never a forced requirement.

## Success Criteria

### Primary
- A GM opens the NPC form, picks an NPC category (one of the 6 WFRP4e Bestiary categories, e.g. "Niespokojni umarli"), then a specific creature type within that category (e.g. "Wampir") from a predefined catalog; the form auto-fills an editable stat table (the 12 Attributes + Creature Traits) from that type's default template. The GM can edit any value or accept the defaults as-is. Derived/secondary stats (e.g. Żywotność, computed from related Attributes) recalculate live as the GM edits the Attributes they depend on. On save, the NPC carries the full WFRP4e stat block alongside its existing name/role/traits.

### Secondary
- The AI in-character reaction is enriched to reference the NPC's WFRP4e stats (e.g. notable strength, fear-inducing traits) when present, not just role/traits as today — a bonus on top of the primary flow, not a blocking requirement.

### Guardrails
- Existing NPCs created without any WFRP4e data continue to work exactly as today — the new fields are additive/optional, never retroactively required.
- The existing AI reaction flow does not regress for any NPC, with or without WFRP4e stats.
- The NPC form remains usable for fast, on-the-fly creation — the full WFRP4e block does not force the GM through every field before saving.
- Per-user data isolation covers any new NPC stat data exactly as it does today for name/role/traits — no cross-account visibility.
- A GM editing an Attribute that a derived stat depends on sees the derived stat update without a page reload and without perceptible delay.
- (Carried over, unchanged) The product remains usable on the two most recent major versions of the four mainstream desktop browsers without installing additional software.
- (Carried over, unchanged) A GM submitting an AI reaction query sees continuous visible feedback within 2 seconds of submitting, even if the full response is not yet ready.

**Scope decision:** The creature catalog targets the full official WFRP4e Bestiary (all 6 categories and their subcategories) rather than a curated subset for v1. This is a deliberately larger scope than the original MVP's tight timeline, with the timeline constraint explicitly relaxed to accommodate it (see Open Questions).

## User Stories

### US-02: GM builds an NPC's WFRP4e stat block from the Bestiary catalog

- **Given** a logged-in GM editing an NPC (new or existing)
- **When** they select a Bestiary category, then a specific creature type within it
- **Then** the stat table (12 Attributes + standard Creature Traits) auto-fills from that type's default template, remains fully editable, and any derived stats (e.g. Żywotność) recalculate live as dependent Attributes change

#### Acceptance Criteria
- Auto-fill happens immediately on selecting a creature type, before any manual edit
- Every auto-filled value can be overridden by the GM; accepting defaults without editing is a valid path
- Changing an Attribute that a derived stat depends on updates that derived stat without a page reload or explicit recalculate action
- An NPC saved without ever selecting a category/type keeps working exactly as before this change (no stats block required) — this was not previously possible before this change since no stats block existed at all

## Scope of Change

### WFRP4e stats — NPC

- [new] FR-012: GM can find an NPC's creature type via a single search spanning all 6 WFRP4e Bestiary categories (Ludy Reiklandu, Zwierzyniec Reiklandu, Potworne Bestie Reiklandu, Hordy Zielonoskórych, Niespokojni Umarli, Niewolnicy Ciemności), with category available as a grouping/filter rather than a mandatory separate step. Priority: must-have.
  > Socrates: Counter-argument considered: "a mandatory category-first step is an extra click if the type selector already supports quick search." Resolution: modified — category remains part of the catalog's structure (grouping/filter), but selection is a single search, not two forced sequential steps.

- [new] FR-013: GM can select a specific creature type from the predefined Bestiary catalog. Priority: must-have.
  > Socrates: No counter-argument surfaced; catalog-driven selection is the mechanism that makes auto-fill possible.

- [new] FR-014: Selecting a creature type auto-fills the NPC's stat table (12 Attributes + standard Creature Traits) with that type's default values, without silently discarding values the GM already edited by hand. Priority: must-have.
  > Socrates: Counter-argument considered: "immediate auto-fill on type change risks silently overwriting manual edits already made." Resolution: kept as must-have, with the added guarantee that a type change never silently discards prior manual edits — the exact mechanism (e.g. a confirmation step) is a downstream implementation decision.

- [new] FR-015: GM can edit any attribute or trait value in the stat table, overriding the defaults, within sensible bounds (e.g. Attributes constrained to their valid range) — or accept the defaults as-is. Priority: must-have.
  > Socrates: Counter-argument considered: "fully unbounded free-text editing undermines the catalog's consistency." Resolution: kept must-have and editable, but bounded validation is added so edited values stay mechanically valid.

- [new] FR-016: Derived/secondary stats (e.g. Żywotność) recalculate automatically from their dependent Attributes, but the GM can explicitly override a derived value (e.g. a boss with bonus HP), which then stops auto-recalculating until the override is cleared. Priority: must-have.
  > Socrates: Counter-argument considered: "pure auto-calculation fights a GM who wants to manually set a non-standard derived value (e.g. boss HP)." Resolution: modified — auto-calculation is the default, but an explicit manual override is allowed per derived field.

- [new] FR-017: GM can add optional Creature Traits specific to an individual NPC, beyond the creature type's standard defaults (e.g. Zaraza, Szał Bojowy). Priority: must-have.
  > Socrates: No counter-argument surfaced; distinguishing standard (type-default) vs individually-added traits has value (e.g. for resetting to defaults) and stands as written.

- [new] FR-018: GM can view and edit a Skills & Talents block for an NPC (standard skills/talents from the profession system, for named/important NPCs). Priority: must-have.
  > Socrates: No counter-argument surfaced; kept must-have despite adding scope on top of the full Bestiary catalog, consistent with the user's timeline decision.

- [new] FR-019: The NPC record persists the full WFRP4e stat block (Attributes, Creature Traits, Skills & Talents) alongside the existing name/role/traits fields. Priority: must-have.
  > Socrates: No counter-argument surfaced; this is the foundation every other FR in this section depends on.

### Equipment

- [new] FR-020: GM can optionally record Equipment (weapons/items) for an NPC beyond what's implied by its Creature Traits. Priority: nice-to-have.
  > Socrates: No counter-argument surfaced; Creature Traits (e.g. "Broń +5") already cover baseline attack power without a full Equipment model, so this stays deferred.

### AI reaction

- [new] FR-021: The AI in-character reaction references an NPC's descriptive WFRP4e traits (e.g. Strach/Fear, notable strength) when present, without exposing raw dice-relevant numbers that could be used to resolve mechanics on their own. Priority: nice-to-have.
  > Socrates: Counter-argument considered: "raw stats in the prompt risk the AI attempting to resolve mechanics (e.g. announcing roll outcomes) unprompted." Resolution: modified — scope narrowed to descriptive traits, not raw numeric stats, for the reaction prompt.

### Preserved behavior

- [preserved] FR-022: GM can still create, view, edit, and delete an NPC using only name/role/traits — no WFRP4e stats required.
  > Socrates: No counter-argument surfaced; direct non-regression guarantee for existing users.

- [preserved] FR-023: AI reaction continues to work unchanged for NPCs without any WFRP4e stats.
  > Socrates: No counter-argument surfaced; direct non-regression guarantee for the flagship AI reaction capability.

## Constraints & Compatibility

- **Data changes for existing records:** No retroactive changes to existing records — existing NPCs simply have no WFRP4e stat data until a GM adds it; nothing is computed or defaulted onto pre-existing records automatically.
- **Reference data vs. per-user data:** The Bestiary catalog (creature categories, types, default templates, standard Creature Traits) is reference data common to all accounts — unlike NPC records, which remain owned by a single user exactly as today.
- **Backward compatibility:** No existing behavior, route, or data format changes for NPCs that don't use the new stats — see the preserved items in Scope of Change.
- **Existing integrations:** No new external dependencies are introduced by this change; it adds data and UI on top of what already exists.

## Business Logic Changes

**Current rule:** Given a named NPC's profile (role, free-text traits) and its known relationships to other NPCs, the application generates an in-character response to a user-supplied scenario.

**New rule (addition):** Given an NPC's WFRP4e Attributes (the fixed set of 12 characteristic values from the Bestiary format), the application computes its derived/secondary stats (e.g. Żywotność) using the game's own formulas, and keeps them synchronized whenever a dependent Attribute is edited — unless the GM has explicitly overridden a derived value (FR-016).

**Modified rule (nice-to-have):** The existing AI in-character reaction rule optionally extends its inputs to include an NPC's descriptive WFRP4e traits (not raw numeric stats) when present, alongside role, traits, and relationships (FR-021).

## Access Control Changes

No access control changes — current model preserved. Email + password login; flat role model (no admin panel, no team workspaces, no sharing); every campaign, NPC, and relationship remains owned by exactly one user with no cross-account visibility. The new WFRP4e stat data on an NPC inherits the same per-user ownership guarantee as the rest of the NPC profile — no new role or access boundary is introduced by this change.

## Non-Goals

- No in-app combat/dice resolution — WFRP4e stats are descriptive/mechanical data for use at the physical table; the app does not resolve tests, initiative, or rolls.
- No user-facing editor for the Bestiary reference catalog itself in this change — categories/types/default templates are seeded reference data maintained by the team, not user-editable; GMs edit only their own NPC's instance of a stat block, not the shared catalog.
- No sharing of a GM's own custom/homebrew stat variants between users — consistent with the existing no-cross-account-visibility model.
- No full Career/Profession progression system — Skills & Talents (FR-018) are recorded as a data block on the NPC; the app does not model career levels, advancement requirements, or XP.

## Open Questions

1. **What is the delivery timeline (in weeks)?** — User explicitly declined to commit a number, deprioritizing speed in favor of full Bestiary catalog completeness. Owner: user. Block: no (only affects roadmap sequencing, not scope).
