# NPC Relationships Implementation Plan

## Overview

Deliver the third user-visible product slice (S-03): a GM can **create a relationship between two NPCs (type + description), view all relationships for an NPC, and delete a relationship**. Relationships are the relational context that S-04's AI reaction will consume, so the data shape is validated here before the AI layer attaches to it.

Relationships are modeled as a directed, self-referential **many-to-many junction table `npc_has_npc`** (two FKs into `npcs`, plus `type` and `description` as association attributes). The slice mirrors the proven `npc-crud` pattern (migration → types → API → island → page) with four deliberate departures: the table is a self-referential junction; there is **no edit** (create + delete only, per FR-009); there is **no `updated_at`/`moddatetime`** (nothing ever updates a row); and the UI is an **inline island on the existing NPC detail page** rather than dedicated pages.

## Current State Analysis

- **NPC slice is complete and merged** — it is the direct template. `npcs` table + 4 per-operation RLS policies + `moddatetime` trigger (`supabase/migrations/20260604010000_create_npcs.sql`); JSON REST routes (`src/pages/api/npcs/index.ts` POST, `[id].ts` PATCH/DELETE); islands (`NpcList`, `NpcCard`, `NpcForm`) reusing `FormField`/`SubmitButton`/`ServerError`; co-located tests (`NpcForm.test.tsx`, `NpcCard.test.tsx`).
- **The NPC detail page is a static SSR read view with no island** (`src/pages/campaigns/[id]/npcs/[npcId]/index.astro`) — it renders name, role, and traits. The npc-crud plan called it "the surface S-04's AI query will later attach to." It is the natural home for relationships and is the page this slice converts to host an island.
- **Cascade-on-delete is pre-decided** — the npc-crud plan states relationships get an "FK-to-`npcs` (with on-delete cascade)," and the roadmap flags the open question "what happens to an NPC's relationships when the NPC is deleted?" (S-02 Unknown). This plan resolves it: both NPC FKs are `on delete cascade`.
- **The insert-ownership-via-subquery pattern exists** — `npcs_insert_own` uses an RLS-filtered subquery against `campaigns` (`supabase/migrations/20260604010000_create_npcs.sql:42-49`). Relationships use a richer version: an owned `campaign_id` plus both NPCs confirmed to live in that campaign.
- **The API double-check pattern exists** — `POST /api/npcs` confirms parent-campaign ownership with an RLS-scoped `.maybeSingle()` before insert and returns `404` on miss (`src/pages/api/npcs/index.ts:44-51`); RLS is the backstop. The relationships POST extends this to verify both NPCs.
- **Auth + middleware** — `/campaigns` is already in `PROTECTED_ROUTES`; the `startsWith` check covers every nested path including the NPC detail page. No middleware change.
- **ESLint `.astro` redirect rule** — already configured (lessons.md). The detail page already uses `return Astro.redirect(...)` and inherits the override; editing it needs no eslint change.
- **Types** — `src/types.ts` has `Campaign`/`Npc` + DTOs; relationship types append here.

## Desired End State

A logged-in GM opens an NPC's detail page (`/campaigns/[id]/npcs/[npcId]`) and, below the profile, sees a **Relationships** section:

- A list of every relationship touching this NPC (whether this NPC is the source or the target), each showing the partner NPC's name, the relationship `type`, an optional `description`, a direction indicator (outgoing/incoming), and a two-click-confirm Delete.
- An add form: pick another NPC in the same campaign, enter a free-text `type` (required) and optional `description`, submit. The new relationship appears immediately.
- When the campaign has no other NPC to link to, the add form is hidden and a hint points the GM to add another NPC first.

All relationship data is RLS-isolated per user; a relationship can only join two NPCs that both belong to one campaign the user owns. Deleting an NPC (or its campaign) cascade-deletes every relationship touching it.

### Key Discoveries:

- `createClient(headers, cookies)` works identically in API handlers and Astro frontmatter — see `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:6`.
- supabase-js OR-filter across two columns is `.or("from_npc_id.eq.<id>,to_npc_id.eq.<id>")` — needed for the "either endpoint" relationship query.
- `.maybeSingle()` after a mutation with `.select()` lets the handler return `404` when RLS rejects the row vs `200` — see `src/pages/api/npcs/[id].ts:46,72`.
- An RLS `WITH CHECK` subquery against `npcs`/`campaigns` is itself RLS-filtered, so `from_npc_id in (select id from public.npcs where ...)` can only match the caller's own NPCs — this is what blocks linking a foreign NPC.
- The two-click confirm state machine (`confirming` state + a document-level click listener that resets it + `event.stopPropagation()`) lives in `NpcCard.tsx:12-35` and ports directly to `RelationshipRow`.
- The static NPC detail page is centered in a single `max-w-2xl` card (`index.astro:25-26`); hosting a relationships section means adding a second section below the profile card in the same column, keeping the existing `max-w-2xl` width (no container widening — see Phase 4).

## What We're NOT Doing

- **No relationship editing** — FR-009 is "view and delete." No PATCH route, no edit form, no update RLS policy. To change a relationship, delete and recreate it.
- **No `updated_at` column or `moddatetime` trigger** — rows are immutable after creation (no edit path), so an update trigger would be dead infrastructure.
- **No cross-campaign relationships** — both NPCs must belong to one owned campaign; the partner picker only lists that campaign's NPCs.
- **No duplicate-pair prevention** — multiple relationships between the same pair are allowed (e.g. "ally" and "business partner"); only self-relationships are blocked (`CHECK from_npc_id <> to_npc_id`).
- **No relationship `type` enum** — free text (max 100), consistent with the forgiving-of-sparse-data persona and how `role`/`traits` are handled.
- **No GET list API endpoint for relationships** — SSR provides the list; the island updates optimistically on create/delete, so a list endpoint would be dead code (same rationale as npc-crud).
- **No visual relationship graph** — FR-011 is a parked nice-to-have (PRD Non-Goals).
- **No AI query** — FR-010/US-01 belong to S-04. This slice only produces the relational data the AI will later read.
- **No Supabase generated TypeScript types** — handwritten types in `src/types.ts` remain sufficient.
- **No automated API integration tests** — matches the campaigns/npcs precedent; API routes are verified manually, component logic by unit tests.

## Implementation Approach

Four sequential phases, mirroring npc-crud: schema first (nothing works without it), then types + API (backend contract), then the React island + tests (client behavior), then the detail-page integration (makes it end-to-end testable).

Relationships are addressed by their globally-unique `id` for delete (`DELETE /api/relationships/[id]`), while creation carries `campaign_id`, `from_npc_id`, and `to_npc_id` in the body (`POST /api/relationships`) — keeping the API shape identical to campaigns/npcs (`index.ts` + `[id].ts`). RLS does ownership enforcement on every operation; the POST handler additionally verifies, with clean `404`s, that the campaign is owned and that both NPCs live in it.

The NPC detail page SSR-fetches the campaign's NPC list (for the partner picker and name resolution) and the NPC's relationships (the "either endpoint" OR-query), and passes them as props to a single `RelationshipSection` island (`client:load`). The island owns the add form and orchestrates create/delete; a small `RelationshipRow` child carries the two-click-confirm delete. No mount-time fetch.

## Critical Implementation Details

**The current NPC is always the relationship's `from`.** The add form lives on a specific NPC's page; submitting sets `from_npc_id = <this npc>` and `to_npc_id = <picked partner>`. The `description` is therefore authored from this NPC's perspective. When the same row is viewed on the partner's page, it is an *incoming* relationship. This keeps creation unambiguous (no direction toggle) while the view query (`from_npc_id = X OR to_npc_id = X`) still surfaces every relationship touching an NPC. The island labels each row outgoing vs incoming by comparing `from_npc_id` to the current `npcId`.

**Insert ownership is enforced in two layers.** `POST /api/relationships` first confirms the `campaign_id` resolves to an owned campaign and that **both** `from_npc_id` and `to_npc_id` resolve to NPCs in that campaign (RLS-scoped `select id from npcs where id in (...) and campaign_id = ...` expecting two rows), returning `404` otherwise. The `npc_has_npc_insert_own` RLS policy independently re-checks the same via `WITH CHECK` subqueries. The API check yields clean `404`s; RLS is the defense-in-depth backstop. Do not rely on `user_id = auth.uid()` alone — that would let a crafted request link a foreign NPC under the caller's own `user_id`.

**Same-campaign is the load-bearing invariant.** Both NPC FKs and the denormalized `campaign_id` must agree. The insert policy's subqueries scope both NPCs to `campaign_id`, so a relationship can never span two campaigns even if both NPCs are owned.

---

## Phase 1: Database Schema

### Overview

Create the `npc_has_npc` junction table with RLS enabled and per-operation policies (select/insert/delete — no update), a self-relationship CHECK, and both-NPC ownership enforcement on insert. This unblocks all subsequent phases. The migration must be applied locally (`npx supabase db reset`) before Phase 2 can be tested.

### Changes Required:

#### 1. Supabase migration file

**File**: `supabase/migrations/20260604020000_create_npc_has_npc.sql` (create)

**Intent**: Create the `npc_has_npc` junction table linking two NPCs within one campaign, enable Row Level Security, and add per-operation policies so every relationship operation is isolated to the authenticated user and a relationship can only join two NPCs that both belong to a campaign the user owns.

**Contract**: Columns — `id` (uuid primary key, default `gen_random_uuid()`), `user_id` (uuid not null, FK to `auth.users(id)` on delete cascade), `campaign_id` (uuid not null, FK to `public.campaigns(id)` on delete cascade), `from_npc_id` (uuid not null, FK to `public.npcs(id)` on delete cascade), `to_npc_id` (uuid not null, FK to `public.npcs(id)` on delete cascade), `type` (text not null), `description` (text, nullable), `created_at` (timestamptz not null default `now()`). No `updated_at`, no `moddatetime` trigger (rows are never updated). Table-level `CHECK (from_npc_id <> to_npc_id)` to block self-relationships. Two indexes — `npc_has_npc_from_idx on (from_npc_id)` and `npc_has_npc_to_idx on (to_npc_id)` — so the "either endpoint" OR-query can bitmap both sides. Enable RLS and create three policies scoped to the `authenticated` role:
- `npc_has_npc_select_own` → `USING (auth.uid() = user_id)`
- `npc_has_npc_insert_own` → `WITH CHECK` of: `auth.uid() = user_id` AND `campaign_id in (select id from public.campaigns where user_id = auth.uid())` AND `from_npc_id in (select id from public.npcs where campaign_id = npc_has_npc.campaign_id and user_id = auth.uid())` AND `to_npc_id in (select id from public.npcs where campaign_id = npc_has_npc.campaign_id and user_id = auth.uid())`
- `npc_has_npc_delete_own` → `USING (auth.uid() = user_id)`

The campaign-scoped NPC subqueries in `npc_has_npc_insert_own` are what enforce both ownership and the same-campaign invariant; each subquery is itself RLS-filtered so it can only see the caller's own rows.

### Success Criteria:

#### Automated Verification:

- Migration file exists at `supabase/migrations/20260604020000_create_npc_has_npc.sql`
- `npx supabase db reset` completes without error

#### Manual Verification:

- Supabase Studio shows the `npc_has_npc` table with all columns, both FKs to `npcs`, the FKs to `campaigns`/`auth.users`, the `CHECK (from_npc_id <> to_npc_id)`, and both indexes
- RLS is enabled and all three policies are present with correct definitions
- As user A, inserting a relationship between two of user A's NPCs in the same campaign succeeds
- Inserting a relationship referencing user B's NPC, or two NPCs from different campaigns, is rejected by RLS
- Inserting a self-relationship (`from_npc_id = to_npc_id`) is rejected by the CHECK constraint
- Deleting an NPC cascade-deletes every relationship where it is `from` or `to`
- Deleting a campaign cascade-deletes its NPCs and their relationships
- Querying relationships as user B returns none of user A's relationships

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Types & API Routes

### Overview

Append the `Relationship` type and create DTO to `src/types.ts`, then implement the create and delete REST endpoints. After this phase the backend contract is testable independently of the UI.

### Changes Required:

#### 1. Relationship types

**File**: `src/types.ts` (edit — append)

**Intent**: Define the canonical relationship entity and the DTO used by the API route and the form. No update DTO (no edit path).

**Contract**:
- `Relationship` — mirrors the DB row: `{ id: string; user_id: string; campaign_id: string; from_npc_id: string; to_npc_id: string; type: string; description: string | null; created_at: string; }`
- `CreateRelationshipDto` — `{ campaign_id: string; from_npc_id: string; to_npc_id: string; type: string; description?: string | null; }`

#### 2. Relationship create endpoint

**File**: `src/pages/api/relationships/index.ts` (create)

**Intent**: Handle creating a relationship (POST) between two NPCs in a campaign the user owns. No GET — listing is handled by SSR on the NPC detail page.

**Contract**:
- `export const prerender = false` at the top; reuse the `json(status, body)` helper shape from `src/pages/api/npcs/index.ts`.
- `POST` handler — reads JSON body, validates with zod: `campaign_id` (uuid), `from_npc_id` (uuid), `to_npc_id` (uuid), `type` (string, min 1, max 100), `description` (string, max 2000, nullish). Reject `from_npc_id === to_npc_id` with `400`. Returns `401` if unauthenticated; `400` on invalid JSON or validation failure. Before inserting: (a) confirm the campaign is owned via RLS-scoped `select id from campaigns where id = campaign_id` `.maybeSingle()` → `404 { error: "Campaign not found" }` if empty; (b) confirm both NPCs belong to that campaign via `select id from npcs where campaign_id = campaign_id and id in (from_npc_id, to_npc_id)` → expect exactly 2 rows, else `404 { error: "NPC not found" }`. Insert with `user_id` set to the authenticated user's id and the body fields, chaining `.select().single()`. Returns `201 { data: Relationship }`.

#### 3. Relationship delete endpoint

**File**: `src/pages/api/relationships/[id].ts` (create)

**Intent**: Handle deleting a relationship (DELETE), ownership-checked via RLS. No PATCH.

**Contract**:
- `export const prerender = false` at the top.
- `DELETE` handler — deletes the relationship where `id = params.id` (RLS enforces ownership), chaining `.select().maybeSingle()`. Returns `200 { data: { id: string } }`; `401` if unauthenticated; `400` if the id param is missing; `404` when the result is empty. Mirrors `src/pages/api/npcs/[id].ts:58-82`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new files
- `npm run build` emits no TypeScript errors on the new files

#### Manual Verification:

- `POST /api/relationships` with `{ campaign_id, from_npc_id, to_npc_id, type: "Ally" }` for two owned NPCs in that campaign returns `201` with the created relationship
- `POST /api/relationships` with a foreign `campaign_id`, a foreign NPC id, or NPCs from two different campaigns returns `404`
- `POST /api/relationships` with `from_npc_id === to_npc_id` returns `400`
- `DELETE /api/relationships/<id>` returns `{ data: { id } }` and the row is gone
- `DELETE` against another user's relationship returns `404`
- Requests without a session return `401`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: React Components

### Overview

Build the relationship island and its row child for client-side interactions, plus their unit tests. The island receives initial data as props from SSR and calls the API routes for create/delete mutations.

### Changes Required:

#### 1. Relationship row

**File**: `src/components/relationships/RelationshipRow.tsx` (create)

**Intent**: Render a single relationship as a row showing the partner NPC's name, the `type` (badge), an optional `description`, a direction indicator (outgoing vs incoming relative to the current NPC), and a two-click-confirm Delete button.

**Contract**:
```typescript
interface RelationshipRowProps {
  relationship: Relationship;
  currentNpcId: string;
  partnerName: string; // resolved by the parent from the campaign NPC list
  onDelete: (id: string) => void;
}
```
Direction is derived: `outgoing = relationship.from_npc_id === currentNpcId`. Show the partner name, a `type` badge (style consistent with the `role` badge in `NpcCard.tsx:45-52`), the `description` (or an italic "No description" placeholder when null), and a small outgoing/incoming indicator (e.g. an arrow or a muted label). Delete uses the two-click confirm state machine ported from `NpcCard.tsx:12-35` (`confirming` local state + document click listener that resets it; `event.stopPropagation()` on the button). Use `cn()` from `@/lib/utils`.

#### 2. Relationship section (island)

**File**: `src/components/relationships/RelationshipSection.tsx` (create)

**Intent**: The `client:load` island mounted on the NPC detail page. Renders the relationship list, an inline add form (partner picker + type + optional description), and orchestrates create/delete against the API. Hides the add form with a hint when there is no eligible partner NPC.

**Contract**:
```typescript
interface RelationshipSectionProps {
  npcId: string;
  campaignId: string;
  campaignNpcs: Npc[];               // all NPCs in the campaign (incl. current) — picker + name resolution
  initialRelationships: Relationship[]; // rows where from_npc_id or to_npc_id === npcId
}
```
Internal state: `relationships` (starts from `initialRelationships`), form fields (`partnerId`, `type`, `description`), client-side `errors`, and `serverError`. Eligible partners = `campaignNpcs` minus the current NPC. **When there are no eligible partners**, hide the form and render a hint ("Add another NPC to this campaign to create relationships."); the relationships list (with its empty state) still renders.

Add form: a `<select>` of eligible partners, a `type` text input (required, max 100 — reuse `FormField`), and a `description` textarea (optional, max 2000 — plain `<textarea>` styled like `NpcForm.tsx:108-134`, with a live char counter). Validate client-side (type required + length caps; partner selected). On submit, `POST /api/relationships` with `{ campaign_id: campaignId, from_npc_id: npcId, to_npc_id: partnerId, type, description: trimmed-or-null }`. On success, append the returned `Relationship` to local state and reset the form. Render `ServerError` for API errors; use `SubmitButton` for submit.

List: map `relationships` to `RelationshipRow`, resolving each row's `partnerName` from `campaignNpcs` (the endpoint that is **not** `npcId`; fall back to "Unknown NPC" if not found). Empty state: "No relationships yet." The delete handler calls `DELETE /api/relationships/${id}` and on success removes the row from local state (same `mutate` shape as `NpcList.tsx:20-33`).

#### 3. Relationship section unit tests

**File**: `src/components/relationships/RelationshipSection.test.tsx` (create)

**Intent**: Cover the add-form validation, the partner-picker / no-partner branch, and the create call shape — mirroring `NpcForm.test.tsx`.

**Contract**: Assert that with eligible partners the form renders a partner `<select>`, a `type` input, and a `description` textarea; that submitting with an empty `type` shows the required error and does not call `fetch`; that a `type` over 100 chars and a `description` over 2000 chars are rejected client-side; that a valid submission posts to `/api/relationships` with `from_npc_id` equal to the current `npcId`, `to_npc_id` equal to the selected partner, and `campaign_id` in the body. Assert that when `campaignNpcs` contains only the current NPC, the form is hidden and the hint is shown. Assert that an initial relationship renders with the partner's name resolved from `campaignNpcs`.

#### 4. Relationship row unit tests

**File**: `src/components/relationships/RelationshipRow.test.tsx` (create)

**Intent**: Cover the two-click delete state machine and direction labeling — mirroring `NpcCard.test.tsx`.

**Contract**: Assert first Delete click shows "Confirm?" without firing `onDelete`; second click fires `onDelete(relationship.id)`; a click elsewhere resets the confirming state. Assert the row shows the `partnerName` and `type`, and that the outgoing/incoming indicator reflects whether `from_npc_id === currentNpcId`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new files
- `npm run build` emits no TypeScript errors
- `npm run test` — `RelationshipSection.test.tsx` and `RelationshipRow.test.tsx` pass

#### Manual Verification:

- `RelationshipSection` renders the add form (partner select, type, description) when there is at least one other NPC in the campaign
- `RelationshipSection` hides the form and shows the hint when the current NPC is the only one in the campaign
- `RelationshipRow` shows the partner name, type badge, description, direction indicator, and a Delete action
- Two-click delete confirm works and resets on external click

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: NPC Detail Page Integration

### Overview

Convert the static NPC detail page to fetch the campaign's NPC list and the NPC's relationships server-side and host the `RelationshipSection` island below the profile. This makes the full end-to-end flow testable in the browser. No new pages, no middleware change, no eslint change.

### Changes Required:

#### 1. NPC detail page hosts the relationships island

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro` (edit)

**Intent**: Keep the existing profile read view (name, role, traits) and add a Relationships section beneath it that hosts the island, fed by SSR-fetched data.

**Contract**: In frontmatter, after the existing `npc` fetch + null-redirect (`index.astro:17-21`), add two RLS-scoped queries: (a) the campaign's NPC roster for the picker and name resolution — `select * from npcs where campaign_id = id order by name`, typed `Npc[]` (use `select("*")` to match the existing `npc` fetch on `index.astro:17` and keep the `Npc[]` cast honest; the island reads only `id`/`name`); (b) this NPC's relationships — `select * from npc_has_npc` filtered with `.or("from_npc_id.eq.<npcId>,to_npc_id.eq.<npcId>")` and `.order("created_at", { ascending: true })`, typed `Relationship[]` (default `[]` on null). The explicit ascending `created_at` order makes the list deterministic across reloads; the island appends each newly created row to the end of local state, which matches this order. Keep the profile card at its current `max-w-2xl` width and add the Relationships section in the same single column directly below it (do not widen the container — this avoids any regression to the existing chrome). Mirror the section-heading pattern already on the page (the `<h2>` "Traits" heading at `index.astro:56`) and the cosmic card styling for the new section. Mount `<RelationshipSection npcId={npcId} campaignId={id} campaignNpcs={npcs} initialRelationships={relationships} client:load />`. Import `RelationshipSection` and the `Relationship`/`Npc` types. The existing Edit and "← Back" links stay.

### Success Criteria:

#### Automated Verification:

- `npm run build` completes with no errors
- `npm run lint` passes across all changed files
- `npm run test` — existing `NpcCard.test.tsx` / `NpcForm.test.tsx` still pass (no regressions)

#### Manual Verification:

- Unauthenticated visit to `/campaigns/<id>/npcs/<npcId>` redirects to `/auth/signin`
- The NPC detail page shows the profile and, below it, the Relationships section
- With ≥2 NPCs in the campaign: add a relationship (pick partner, type "Ally", description) → it appears immediately in the list
- The same relationship appears on the partner NPC's detail page, labeled as incoming
- When the campaign has only one NPC, the add form is hidden and the hint is shown
- Two-click delete removes the relationship row; a direct DB query confirms the row is gone
- Deleting one of the two NPCs removes the relationship (cascade); the surviving NPC's page no longer lists it
- Cross-account isolation: user B cannot see or delete user A's relationships, and cannot link to user A's NPCs

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `RelationshipSection` — empty `type` rejected (no `fetch`); type > 100 and description > 2000 rejected client-side; valid submit posts to `/api/relationships` with `from_npc_id === npcId`, the selected `to_npc_id`, and `campaign_id`; form hidden + hint shown when the current NPC is the only NPC; initial relationship renders with the partner name resolved.
- `RelationshipRow` — two-click delete state machine (first click confirms, second fires `onDelete`, external click resets); partner name + type render; outgoing/incoming indicator reflects `from_npc_id === currentNpcId`.

### Integration Tests:

- (Manual) `POST /api/relationships` with two owned same-campaign NPCs returns 201; a foreign campaign/NPC or cross-campaign pair returns 404; `from === to` returns 400; missing session returns 401.
- (Manual) `DELETE /api/relationships/<id>` removes the row; against another user's relationship returns 404.

### Manual Testing Steps:

1. In a campaign with two NPCs (A and B), open A's detail page and confirm the empty Relationships state with a visible add form.
2. Add a relationship A→B (type "Ally", a short description); confirm it appears immediately on A's page.
3. Open B's detail page; confirm the same relationship appears, labeled incoming.
4. Add a second relationship between the same pair with a different type; confirm both coexist (duplicates allowed).
5. Delete a relationship via two-click confirm; confirm the row is removed and the DB row is gone.
6. Delete NPC B; confirm every relationship touching B is cascade-deleted and gone from A's page.
7. Create a campaign with a single NPC; confirm the add form is hidden and the hint is shown.
8. In an incognito window as a second account, confirm none of the first account's relationships are reachable and its NPCs cannot be linked.

## Performance Considerations

Small data volume (PRD: `data_volume: small`). The relationships query is a single OR-filtered scan over two indexed columns per NPC detail page load; the partner picker is one indexed query by `campaign_id`. Acceptable latency, no pagination needed, no caching layer at this scale.

## Migration Notes

Phase 1 adds the third migration (`20260604020000_create_npc_has_npc.sql`), ordered after the campaigns and npcs migrations. Apply locally with `npx supabase db reset` (re-applies all migrations to the local stack). For production, apply via `npx supabase db push` or the Supabase dashboard SQL editor. No data backfill is needed (new table).

## References

- Roadmap slice: `context/foundation/roadmap.md` → S-03
- Sibling plan (template): `context/changes/npc-crud/plan.md`
- PRD functional requirements: FR-008, FR-009; Business Logic (relationships as AI context); US-01 (relationships enrich, not gate, AI output)
- Migration pattern: `supabase/migrations/20260604010000_create_npcs.sql`
- API pattern: `src/pages/api/npcs/index.ts`, `src/pages/api/npcs/[id].ts`
- Island pattern: `src/components/npcs/{NpcList,NpcCard,NpcForm}.tsx`
- Detail page (to edit): `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`
- Test pattern: `src/components/npcs/{NpcForm,NpcCard}.test.tsx`
- Lessons: `context/foundation/lessons.md` (`.astro` SSR-redirect eslint rule — already configured)

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema

#### Automated

- [x] 1.1 Migration file exists at `supabase/migrations/20260604020000_create_npc_has_npc.sql` — a4f7b82
- [x] 1.2 `npx supabase db reset` completes without error — a4f7b82

#### Manual

- [x] 1.3 `npc_has_npc` table visible in Studio with all columns, FKs, the self-relationship CHECK, and both indexes — a4f7b82
- [x] 1.4 RLS enabled; all three policies present with correct definitions — a4f7b82
- [x] 1.5 Insert between two owned same-campaign NPCs succeeds; foreign-NPC or cross-campaign insert is RLS-rejected — a4f7b82
- [x] 1.6 Self-relationship insert is rejected by the CHECK constraint — a4f7b82
- [x] 1.7 Deleting an NPC cascade-deletes its relationships (both directions) — a4f7b82
- [x] 1.8 Deleting a campaign cascade-deletes its NPCs and their relationships — a4f7b82
- [x] 1.9 Cross-account isolation verified (user B sees none of user A's relationships) — a4f7b82

### Phase 2: Types & API Routes

#### Automated

- [x] 2.1 `npm run lint` passes on all new files
- [x] 2.2 `npm run build` emits no TypeScript errors on new files

#### Manual

- [x] 2.3 POST /api/relationships between two owned same-campaign NPCs returns 201 with the relationship
- [x] 2.4 POST with a foreign campaign/NPC or a cross-campaign pair returns 404
- [x] 2.5 POST with from_npc_id === to_npc_id returns 400
- [x] 2.6 DELETE /api/relationships/<id> removes the row
- [x] 2.7 DELETE against another user's relationship returns 404
- [x] 2.8 Unauthenticated requests return 401

### Phase 3: React Components

#### Automated

- [ ] 3.1 `npm run lint` passes on all new files
- [ ] 3.2 `npm run build` emits no TypeScript errors
- [ ] 3.3 `npm run test` — `RelationshipSection.test.tsx` and `RelationshipRow.test.tsx` pass

#### Manual

- [ ] 3.4 RelationshipSection renders the add form (partner select, type, description) when an eligible partner exists
- [ ] 3.5 RelationshipSection hides the form and shows the hint when the current NPC is the only one
- [ ] 3.6 RelationshipRow shows partner name, type badge, description, direction indicator, and Delete
- [ ] 3.7 Two-click delete confirm works and resets on external click

### Phase 4: NPC Detail Page Integration

#### Automated

- [ ] 4.1 `npm run build` completes with no errors
- [ ] 4.2 `npm run lint` passes across all changed files
- [ ] 4.3 `npm run test` — existing NPC component tests still pass

#### Manual

- [ ] 4.4 Unauthenticated /campaigns/<id>/npcs/<npcId> redirects to /auth/signin
- [ ] 4.5 Detail page shows the profile and a Relationships section below it
- [ ] 4.6 Adding a relationship (pick partner, type, description) shows it immediately
- [ ] 4.7 The relationship appears on the partner NPC's page, labeled incoming
- [ ] 4.8 Form hidden + hint shown when the campaign has a single NPC
- [ ] 4.9 Two-click delete removes the relationship from the list and DB
- [ ] 4.10 Deleting one NPC cascade-deletes its relationships
- [ ] 4.11 User B cannot see/delete User A's relationships or link to User A's NPCs
