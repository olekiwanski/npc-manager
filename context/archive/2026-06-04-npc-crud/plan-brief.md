# NPC CRUD — Plan Brief

> Full plan: `context/changes/npc-crud/plan.md`

## What & Why

Deliver the second product slice (S-02): a GM can add, view, edit, and delete NPCs **within a campaign** (name, role, traits). NPCs are the entity the whole product is built around — they're the input to the S-04 AI reaction. Because NPCs live under a campaign, this slice also introduces the campaign **detail page** that campaigns-crud deferred.

## Starting Point

Campaigns-crud is complete and merged — it's a near-exact template (migration + 4 RLS policies, JSON REST `index.ts`/`[id].ts`, three islands reusing `FormField`/`SubmitButton`/`ServerError`, co-located component tests). There is no campaign detail page yet; `CampaignCard` only links to edit. `/campaigns` is already auth-protected and is already the Topbar home.

## Desired End State

A GM clicks a campaign card to open `/campaigns/[id]`, sees that campaign's NPC roster, and can create an NPC, view its full profile, edit it, and delete it (two-click confirm). NPC data is RLS-isolated per user, an NPC can't be attached to a campaign the user doesn't own, and deleting a campaign cascade-deletes its NPCs.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| NPC RLS | Denormalize `user_id` onto `npcs` | Reuses the exact 4-policy campaigns pattern verbatim — simplest and fastest | Plan |
| Foreign-campaign guard | Insert policy + API both check campaign ownership | `user_id = auth.uid()` alone wouldn't stop attaching an NPC to someone else's campaign | Plan |
| Routing | Campaign detail page `/campaigns/[id]` hosts the NPC list; NPC routes nest under it | Fills the deferred detail-page gap and matches the campaign→NPC hierarchy | Plan |
| NPC detail page | Build a read-only detail page now | S-04's AI query attaches to it (US-01); long traits need a real view | Plan |
| Lifecycle | Delete-only, no archive/status | FR-007 specifies view/edit/delete; keeps the schema lean | Plan |
| Fields | `name` required; `role` + `traits` nullable; traits = free-text | PRD says free-text traits; persona is forgiving of sparse data; US-01 must work with sparse profiles | Plan |
| List API endpoint | None — SSR provides the list | No archived filter means no client re-fetch path; a GET would be dead code | Plan |
| Delete placement | On the list card, not the detail page | Mirrors campaigns; keeps the detail page a static read view (no island) | Plan |
| Tests | Mirror campaigns (NpcForm + NpcCard unit tests) | Consistent with the repo's established test surface | Plan |

## Scope

**In scope:**
- `npcs` migration — table + 4 RLS policies + foreign-campaign insert guard + `moddatetime` trigger
- `Npc` type + DTOs appended to `src/types.ts`
- `POST /api/npcs`, `PATCH /api/npcs/[id]`, `DELETE /api/npcs/[id]`
- `NpcCard`, `NpcList`, `NpcForm` islands + `NpcForm.test.tsx`, `NpcCard.test.tsx`
- `/campaigns/[id]` (detail + NPC list), `/campaigns/[id]/npcs/new`, `/campaigns/[id]/npcs/[npcId]` (read view), `/campaigns/[id]/npcs/[npcId]/edit`
- `CampaignCard` title → campaign detail link

**Out of scope:**
- Relationships (S-03) and the AI query (S-04)
- NPC archive/status, search/filter
- NPC list GET API endpoint, generated Supabase types, automated API integration tests
- Middleware / Topbar changes (already covered)

## Architecture / Approach

Astro SSR pages fetch NPC data in frontmatter via `createClient()` and pass it as props to islands — no mount-time fetch. The campaign detail page hosts an `NpcList` island; create/edit happen on dedicated nested pages via `NpcForm` (POST/PATCH to `/api/npcs`), navigating back to the detail page on success. The NPC detail page is a static read view. RLS enforces ownership on every operation; the create path additionally verifies parent-campaign ownership in both the API and the insert policy.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Database Schema | `npcs` table + RLS + foreign-campaign insert guard | RLS subquery misconfiguration could allow foreign-campaign attachment |
| 2. Types & API Routes | `Npc` types + create/update/delete endpoints | Forgetting the API-side campaign-ownership check (relies on RLS only) |
| 3. React Components | NpcCard, NpcList, NpcForm + unit tests | Two-click confirm reset; null role/traits handling in the form |
| 4. Pages & Navigation | Campaign detail page + nested NPC pages, end-to-end | Editing `CampaignCard` must not break its existing test |

**Prerequisites:** Local Supabase stack running (`npx supabase start`); campaigns migration applied. S-01 merged (done).
**Estimated effort:** ~2–3 sessions across 4 phases.

## Open Risks & Assumptions

- The `npcs_insert_own` RLS subquery against `campaigns` is the security-critical line — it must be verified in Phase 1 manual testing (insert with a foreign `campaign_id` must fail).
- Relationship-cascade on NPC delete is intentionally deferred to S-03 (the FK lives there); this slice's NPC delete is a plain row delete.
- The campaign detail page is new surface area beyond a pure campaigns port — the only structural addition this slice makes.

## Success Criteria (Summary)

- A GM can complete the full NPC loop within a campaign: create → view → edit → delete.
- An NPC cannot be created against, and NPCs are not visible across, another user's account (RLS verified).
- Deleting a campaign cascade-deletes its NPCs.
- `npm run build`, `npm run lint`, and `npm run test` all pass on the completed implementation.
