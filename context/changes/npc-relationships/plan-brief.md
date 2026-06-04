# NPC Relationships — Plan Brief

> Full plan: `context/changes/npc-relationships/plan.md`

## What & Why

Deliver S-03 (FR-008/FR-009): a GM can create a relationship between two NPCs (type + description), view all relationships for an NPC, and delete one. Relationships are the relational context S-04's AI reaction will consume, so the data shape is validated now, before the AI layer attaches to it.

## Starting Point

The `npcs` slice is complete and is the direct template (migration + RLS + per-op policies, JSON REST routes, React islands, co-located tests). The NPC detail page (`src/pages/campaigns/[id]/npcs/[npcId]/index.astro`) is currently a static SSR read view with no island — it's the natural, pre-identified home for relationships.

## Desired End State

On an NPC's detail page, below the profile, a Relationships section lists every relationship touching that NPC (partner name, type, description, incoming/outgoing) with a two-click-confirm delete, plus an add form (pick a same-campaign NPC, free-text type, optional description). When there's no other NPC to link to, the form is hidden behind a hint. All data is RLS-isolated; deleting an NPC or campaign cascade-deletes its relationships.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Data model | Directed self-referential junction table `npc_has_npc` (from/to + type + description) | User-specified M2M junction; directed reading is most expressive for AI context | Plan |
| `type` field | Free text (max 100) | Forgiving of sparse/varied data, matches how role/traits are handled | Plan |
| Scope | Same campaign only | Coherent AI context + simpler picker; matches campaign-as-container model | Plan |
| Edit support | Create + delete only (no PATCH) | Exactly matches FR-009; smaller API, no dead code | Plan |
| `updated_at` | Omitted (no `moddatetime`) | Rows are immutable with no edit path | Plan |
| UI placement | Inline island on the NPC detail page | "View all relationships for an NPC" is literally that page's job; S-04 attaches here | Plan |
| Self / duplicates | Block self (CHECK), allow duplicate pairs | Self-links are meaningless; multiple typed links between a pair are useful | Plan |
| Empty picker | Hide form, show hint | Avoids a broken empty dropdown; guides the GM to the prerequisite | Plan |
| Direction convention | Current NPC = `from` | Unambiguous creation; the view query surfaces either endpoint | Plan |

## Scope

**In scope:** `npc_has_npc` table + RLS (select/insert/delete); `Relationship` type + create DTO; `POST /api/relationships` + `DELETE /api/relationships/[id]`; `RelationshipSection` island + `RelationshipRow` + unit tests; NPC detail page integration.

**Out of scope:** relationship editing; cross-campaign relationships; duplicate-pair prevention; type enum; GET list endpoint; visual graph (FR-011); the AI query (S-04); generated Supabase types; automated API integration tests.

## Architecture / Approach

Mirrors the npc-crud pipeline: migration → types → API → island → page. The detail page SSR-fetches the campaign's NPC list (picker + name resolution) and the NPC's relationships (`.or("from_npc_id.eq.X,to_npc_id.eq.X")`), passing both as props to a single `client:load` island that owns the add form and create/delete orchestration; a `RelationshipRow` child carries the two-click delete. Ownership is enforced twice on create: clean `404`s in the POST handler (campaign owned + both NPCs in it) and RLS `WITH CHECK` subqueries as the backstop.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database Schema | `npc_has_npc` table, CHECK, indexes, 3 RLS policies | Insert policy must enforce same-campaign + dual ownership correctly |
| 2. Types & API Routes | `Relationship` type; POST + DELETE endpoints | Two-NPC ownership check returning clean 404s |
| 3. React Components | `RelationshipSection` island + `RelationshipRow` + tests | Direction labeling + partner-name resolution from the NPC list |
| 4. Detail Page Integration | SSR data + island mounted on the NPC detail page | Widening the static page layout without regressing existing chrome |

**Prerequisites:** S-02 (npc-crud) merged — done. Local Supabase stack for `db reset`.
**Estimated effort:** ~1–2 sessions across 4 phases (heavily pattern-driven).

## Open Risks & Assumptions

- Assumes the directed model with current-NPC-as-`from` reads naturally in the UI; if incoming/outgoing labeling is confusing, the row presentation may need a polish pass (no schema change).
- Free-text `type` means no consistency enforcement ("ally" vs "friend") — acceptable at MVP; S-04 prompt construction must tolerate varied labels.
- The partner picker and name resolution rely on the SSR-passed campaign NPC list staying in sync within a page load — fine since there's no client-side NPC mutation on this page.

## Success Criteria (Summary)

- A GM can add, view, and delete typed relationships between two NPCs in a campaign, and sees them on both NPCs' detail pages (incoming/outgoing).
- Deleting an NPC or campaign cleanly removes its relationships (cascade), with no orphans.
- No cross-account access: user B can never see, delete, or link into user A's relationships or NPCs.
