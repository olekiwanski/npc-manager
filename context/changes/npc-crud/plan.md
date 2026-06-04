# NPC CRUD Implementation Plan

## Overview

Deliver the second user-visible product slice (S-02): a GM can add, view, edit, and delete NPCs **within a campaign**. NPCs are a nested resource under a campaign, so this slice also introduces the campaign **detail page** (`/campaigns/[id]`) that campaigns-crud explicitly deferred — it becomes the home for a campaign's NPC list. The implementation mirrors the proven campaigns-crud pattern (migration → types → API → islands → pages) with three deliberate departures: NPCs are scoped to a parent campaign, NPCs are delete-only (no archive), and NPCs get a dedicated read-only detail page (the surface S-04's AI query will later attach to).

## Current State Analysis

- **Campaigns slice is complete and merged** — it is the template for this work. `campaigns` table + 4 per-operation RLS policies + `moddatetime` trigger (`supabase/migrations/20260604000000_create_campaigns.sql`); JSON REST routes (`src/pages/api/campaigns/index.ts`, `[id].ts`); three islands (`CampaignList`, `CampaignCard`, `CampaignForm`) reusing `FormField`/`SubmitButton`/`ServerError`.
- **No campaign detail page exists** — `CampaignCard` only links to `/campaigns/[id]/edit`. campaigns-crud noted: *"No campaign detail/view page — that comes with S-02."* This slice fills that gap.
- **Auth + middleware** — `/campaigns` is already in `PROTECTED_ROUTES` (`src/middleware.ts`); the `startsWith` check already covers every nested path (`/campaigns/[id]`, `/campaigns/[id]/npcs/...`). No middleware change is needed.
- **Topbar** already points at Campaigns — no nav change needed; NPCs live under the campaign hierarchy.
- **Types** — `src/types.ts` exists with `Campaign`, `CreateCampaignDto`, `UpdateCampaignDto`. NPC types get appended here.
- **Tests** — `CampaignForm.test.tsx` and `CampaignCard.test.tsx` are co-located in `src/components/campaigns/`; they are the template for the NPC component tests.
- **Lessons** — `.astro` SSR-redirect pages require `@typescript-eslint/no-misused-promises` disabled for `**/*.astro` in `eslint.config.js` (already done for campaigns-crud Phase 4). New `.astro` pages here use the same `return Astro.redirect(...)` idiom and inherit that config — no eslint change needed.

## Desired End State

A logged-in GM opens a campaign from the campaigns list (clicking the card title navigates to `/campaigns/[id]`), sees the campaign's NPC roster (empty state for a new campaign), and can:
- Add an NPC (name, role, traits) via `/campaigns/[id]/npcs/new`.
- View an NPC's full profile at `/campaigns/[id]/npcs/[npcId]`.
- Edit an NPC via `/campaigns/[id]/npcs/[npcId]/edit`.
- Delete an NPC from its card with a two-click confirm.

All NPC data is RLS-isolated per user — no query returns another account's NPCs, and an NPC cannot be attached to a campaign the user does not own. Deleting a campaign cascade-deletes its NPCs.

### Key Discoveries:

- `createClient(headers, cookies)` works identically in API handlers (`context.request.headers`, `context.cookies`) and Astro frontmatter (`Astro.request.headers`, `Astro.cookies`) — see `src/pages/campaigns/index.astro:8`.
- `.maybeSingle()` after a mutation with `.select()` lets the handler return `404` when RLS rejects ownership (empty result) vs `200` — see `src/pages/api/campaigns/[id].ts:46`.
- supabase-js returns no row from `insert`/`update`/`delete` without a chained `.select()` — see `src/pages/api/campaigns/index.ts:71`.
- An RLS `WITH CHECK` subquery against `campaigns` is itself RLS-filtered, so `campaign_id in (select id from public.campaigns ...)` returns only the user's own campaigns — this is what blocks attaching an NPC to a foreign campaign.
- The two-click confirm state machine (`confirming` state + a document-level click listener that resets it) lives in `CampaignCard.tsx:16-40` and ports directly to `NpcCard`.

## What We're NOT Doing

- **No NPC relationships** — FR-008/FR-009 belong to S-03 (`npc-relationships`). The `relationships` table and its FK-to-`npcs` (with on-delete cascade) are defined there. This slice does not model relationships and does not pre-build cascade behavior for them; deleting an NPC here simply deletes the NPC row.
- **No AI query** — FR-010/US-01 belong to S-04. The NPC detail page is built as a read view now, but the AI scenario input is out of scope.
- **No NPC archive/status lifecycle** — FR-007 specifies view/edit/delete only. The `npcs` table has no `status` column.
- **No NPC search or filter within a campaign** — PRD Non-Goals; browse-only in MVP.
- **No GET list API endpoint for NPCs** — SSR pages provide the NPC list; with no archived filter there is no client-side re-fetch path, so a list endpoint would be dead code.
- **No Supabase generated TypeScript types** — handwritten types in `src/types.ts` remain sufficient.
- **No automated API integration tests** — matches the campaigns precedent; API routes are verified manually. Component logic is covered by unit tests.

## Implementation Approach

Four sequential phases, mirroring campaigns-crud: schema first (nothing works without it), then types + API (backend contract), then React islands (client behavior), then Astro pages + navigation (makes it end-to-end testable).

NPCs are addressed by their globally-unique `id` for mutation (`PATCH`/`DELETE /api/npcs/[id]`), while creation carries `campaign_id` in the body (`POST /api/npcs`) — this keeps the API shape identical to campaigns (`index.ts` + `[id].ts`) rather than deeply nesting routes. RLS does the ownership enforcement on every operation; the API additionally verifies parent-campaign ownership on create.

Astro pages SSR-fetch NPC data in frontmatter and pass it as props to islands — no mount-time fetch. The NPC detail page is a **static SSR read view** (no island): it renders the profile with Edit and Back links. Delete is a client action and lives on the `NpcCard` in the list (two-click confirm), exactly as campaign delete lives on `CampaignCard`.

## Critical Implementation Details

**Parent-campaign ownership on create is enforced in two places.** The `POST /api/npcs` handler first confirms the target `campaign_id` resolves to an owned campaign (an RLS-scoped `select ... maybeSingle()` on `campaigns`) and returns `404` if not. The `npcs_insert_own` RLS policy independently re-checks via a `WITH CHECK` subquery against `campaigns`. The API check produces a clean `404`; the RLS check is the defense-in-depth backstop. Do not rely on `user_id = auth.uid()` alone — that would let a crafted request attach an NPC (with the caller's own `user_id`) to a foreign campaign.

**`role` and `traits` are nullable.** Only `name` is required. The persona is "forgiving of sparse data" and US-01's acceptance criteria state queries must work even with sparse profiles — so NPC creation must not gate on role or traits. The DB columns are `text` (nullable), and the API/form treat empty input as `null` (same trim-to-null pattern as campaign `description`).

**Route layout note.** `src/pages/campaigns/[id]/` already contains `edit.astro` (edit campaign). Adding `index.astro` there creates the campaign detail route `/campaigns/[id]` without colliding with `/campaigns/[id]/edit`. NPC pages nest under `src/pages/campaigns/[id]/npcs/`.

---

## Phase 1: Database Schema

### Overview

Create the `npcs` table with RLS enabled and per-operation policies, scoped per user via a denormalized `user_id` and additionally guarded against foreign-campaign attachment on insert. This unblocks all subsequent phases. The migration must be applied locally (`npx supabase db reset`) before Phase 2 can be tested.

### Changes Required:

#### 1. Supabase migration file

**File**: `supabase/migrations/20260604010000_create_npcs.sql` (create)

**Intent**: Create the `npcs` table linked to `campaigns`, enable Row Level Security, and add per-operation policies so every NPC operation is isolated to the authenticated user and NPCs can only be attached to campaigns the user owns.

**Contract**: Columns — `id` (uuid primary key, default `gen_random_uuid()`), `user_id` (uuid not null, FK to `auth.users(id)` on delete cascade), `campaign_id` (uuid not null, FK to `public.campaigns(id)` on delete cascade), `name` (text not null), `role` (text, nullable), `traits` (text, nullable), `created_at` (timestamptz not null default `now()`), `updated_at` (timestamptz not null default `now()`). Index `npcs_campaign_id_idx` on `(campaign_id)` — the list query filters by campaign. Reuse `moddatetime` (extension already created by the campaigns migration; re-issue `create extension if not exists moddatetime schema extensions;` defensively since it is idempotent) and attach a `before update` trigger `npcs_set_updated_at` calling `extensions.moddatetime(updated_at)`. Enable RLS and create four policies scoped to the `authenticated` role:
- `npcs_select_own` → `USING (auth.uid() = user_id)`
- `npcs_insert_own` → `WITH CHECK (auth.uid() = user_id and campaign_id in (select id from public.campaigns where user_id = auth.uid()))`
- `npcs_update_own` → `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`
- `npcs_delete_own` → `USING (auth.uid() = user_id)`

The campaign-ownership subquery in `npcs_insert_own` is what prevents attaching an NPC to a foreign campaign; the subquery is itself RLS-filtered so it can only see the caller's campaigns.

### Success Criteria:

#### Automated Verification:

- Migration file exists at `supabase/migrations/20260604010000_create_npcs.sql`
- `npx supabase db reset` completes without error

#### Manual Verification:

- Supabase Studio shows the `npcs` table with all columns, FKs, and the `(campaign_id)` index
- RLS is enabled and all four policies are present with correct definitions
- As user A, inserting an NPC into user A's campaign succeeds; inserting one with user B's `campaign_id` is rejected by RLS
- Deleting a campaign cascade-deletes its NPCs
- Querying NPCs as user B returns none of user A's NPCs

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Types & API Routes

### Overview

Append the `Npc` type and DTOs to `src/types.ts`, then implement the create/update/delete REST endpoints. After this phase the backend contract is testable independently of the UI.

### Changes Required:

#### 1. NPC types

**File**: `src/types.ts` (edit — append)

**Intent**: Define the canonical `Npc` entity and the DTOs used by the API routes and forms.

**Contract**:
- `Npc` — mirrors the DB row: `{ id: string; user_id: string; campaign_id: string; name: string; role: string | null; traits: string | null; created_at: string; updated_at: string; }`
- `CreateNpcDto` — `{ campaign_id: string; name: string; role?: string | null; traits?: string | null; }`
- `UpdateNpcDto` — `{ name?: string; role?: string | null; traits?: string | null; }`

#### 2. NPC create endpoint

**File**: `src/pages/api/npcs/index.ts` (create)

**Intent**: Handle creating an NPC (POST) under a campaign the user owns. No GET — listing is handled by SSR pages.

**Contract**:
- `export const prerender = false` at the top; reuse the `json(status, body)` helper shape from `src/pages/api/campaigns/index.ts`.
- `POST` handler — reads JSON body, validates with zod: `campaign_id` (string, uuid), `name` (string, min 1, max 200), `role` (string, max 200, nullish), `traits` (string, max 2000, nullish). Returns `401` if unauthenticated; `400` on invalid JSON or validation failure. Before inserting, confirm the target campaign is owned: RLS-scoped `select id from campaigns where id = campaign_id` via `.maybeSingle()`; if empty, return `404 { error: 'Campaign not found' }`. Insert with `user_id` set to the authenticated user's id and `campaign_id` from the body, chaining `.select().single()`. Returns `201 { data: Npc }` on success.

#### 3. NPC update + delete endpoint

**File**: `src/pages/api/npcs/[id].ts` (create)

**Intent**: Handle editing an NPC's profile (PATCH) and deleting it (DELETE). Both are ownership-checked via RLS.

**Contract**:
- `export const prerender = false` at the top.
- `PATCH` handler — validates with zod: `name` (string, min 1, max 200, optional), `role` (string, max 200, nullish), `traits` (string, max 2000, nullish). Updates the NPC where `id = params.id` (RLS enforces ownership), chaining `.select().maybeSingle()`. Returns `200 { data: Npc }`; `400` on validation failure; `401` if unauthenticated; `404` when the result is empty.
- `DELETE` handler — deletes the NPC where `id = params.id` (RLS enforces ownership), chaining `.select().maybeSingle()`. Returns `200 { data: { id: string } }`; `401` if unauthenticated; `404` when the result is empty.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new files
- `npm run build` emits no TypeScript errors on the new files

#### Manual Verification:

- `POST /api/npcs` with `{ campaign_id, name: "Gundren" }` for an owned campaign returns `201` with the created NPC
- `POST /api/npcs` with another user's `campaign_id` returns `404`
- `PATCH /api/npcs/<id>` with `{ role: "Dwarf merchant" }` returns the updated NPC
- `DELETE /api/npcs/<id>` returns `{ data: { id } }` and the row is gone
- `PATCH`/`DELETE` against another user's NPC returns `404`
- Requests without a session return `401`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: React Components

### Overview

Build the three React island components for client-side NPC interactions, plus their unit tests. They receive initial data as props from SSR and call the API routes for mutations.

### Changes Required:

#### 1. NPC card

**File**: `src/components/npcs/NpcCard.tsx` (create)

**Intent**: Render a single NPC as a card showing name, role, and a traits preview, with a View/Edit affordance and a two-click-confirm Delete button. The card title links to the NPC detail page.

**Contract**:
```typescript
interface NpcCardProps {
  npc: Npc;
  campaignId: string;
  onDelete: (id: string) => void;
}
```
Card title is an `<a>` to `/campaigns/${campaignId}/npcs/${npc.id}` (detail). Show `role` as a subtitle/badge (or "No role" placeholder when null) and `traits` as a line-clamped preview ("No traits" italic placeholder when null). Edit is an `<a>` to `/campaigns/${campaignId}/npcs/${npc.id}/edit`. Delete uses the two-click confirm state machine ported from `CampaignCard.tsx` (`confirming` local state + document click listener that resets it; `event.stopPropagation()` on the button). Use `cn()` from `@/lib/utils`. No archive button (delete-only).

#### 2. NPC list

**File**: `src/components/npcs/NpcList.tsx` (create)

**Intent**: Render the NPC roster grid for one campaign: cards, empty state with a "Create your first NPC" CTA, and orchestrate delete mutations.

**Contract**:
```typescript
interface NpcListProps {
  initialNpcs: Npc[];
  campaignId: string;
}
```
Internal state: `npcs` (starts from `initialNpcs`), `error: string | null`. No filter toggle and no archived re-fetch (delete-only). The delete handler calls `DELETE /api/npcs/${id}`, and on success removes the NPC from local state (same `mutate` shape as `CampaignList.tsx:53` minus the PATCH branch). Empty state shows a CTA `<a>` to `/campaigns/${campaignId}/npcs/new`. API errors render inline above the grid via `ServerError` (`src/components/auth/ServerError.tsx`). Grid layout matches `CampaignList` (`grid sm:grid-cols-2 lg:grid-cols-3`).

#### 3. NPC form

**File**: `src/components/npcs/NpcForm.tsx` (create)

**Intent**: Reusable create/edit form. Create mode POSTs to `/api/npcs` (with `campaign_id`); edit mode PATCHes `/api/npcs/[id]`. On success navigates to the campaign detail page.

**Contract**:
```typescript
interface NpcFormProps {
  campaignId: string;
  npc?: Npc; // undefined = create mode
}
```
Fields: `name` (required text, max 200 — reuse `FormField`), `role` (optional text, max 200 — reuse `FormField`), `traits` (optional textarea, max 2000 — plain `<textarea>` styled like `CampaignForm`'s description, with a live char counter). Validate client-side before submit (name required + length caps; role/traits length caps). Empty role/traits submit as `null` (trim-to-null). Create payload includes `campaign_id: campaignId`. Show `ServerError` for API errors. Use `SubmitButton` for submit. On success navigate to `/campaigns/${campaignId}` via `window.location.href`.

#### 4. NPC form unit tests

**File**: `src/components/npcs/NpcForm.test.tsx` (create)

**Intent**: Cover client-side validation, mirroring `CampaignForm.test.tsx`.

**Contract**: Assert that in create mode all three fields (name, role, traits) are rendered and no values are pre-filled; that in edit mode all three fields are pre-filled from the `npc` prop. Assert that submitting with an empty name shows the required error and does not call `fetch`; that name over 200 chars and traits over 2000 chars are rejected client-side; that a valid create submission posts to `/api/npcs` with `campaign_id` in the body.

#### 5. NPC card unit tests

**File**: `src/components/npcs/NpcCard.test.tsx` (create)

**Intent**: Cover the two-click delete state machine, mirroring `CampaignCard.test.tsx`.

**Contract**: Assert first Delete click shows "Confirm?" without firing `onDelete`; second click fires `onDelete(npc.id)`; a click elsewhere resets the confirming state. Assert the title and Edit links point at the correct `/campaigns/[id]/npcs/[npcId]` paths.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new files
- `npm run build` emits no TypeScript errors
- `npm run test` — `NpcForm.test.tsx` and `NpcCard.test.tsx` pass

#### Manual Verification:

- `NpcForm` (create mode) renders name, role, and traits fields
- `NpcForm` (edit mode) pre-fills all three fields
- `NpcCard` shows name, role, and truncated traits, with title + Edit links and a Delete action
- Two-click delete confirm works and resets on external click
- `NpcList` shows the empty-state CTA when passed `[]`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Pages & Navigation

### Overview

Wire the components into Astro pages and connect the campaigns list to the new campaign detail page. This makes the full end-to-end flow testable in the browser. No middleware or Topbar changes are needed (`/campaigns` prefix is already protected; Campaigns is already the nav home).

### Changes Required:

#### 1. Campaign detail page (hosts the NPC list)

**File**: `src/pages/campaigns/[id]/index.astro` (create)

**Intent**: Authenticated campaign detail page: shows the campaign's name/description with an Edit-campaign link and a Back-to-campaigns link, and hosts the NPC roster for that campaign.

**Contract**: In frontmatter, `createClient(Astro.request.headers, Astro.cookies)` (redirect to `/auth/signin` if null). Extract `id` from `Astro.params`; query `campaigns` where `id = params.id` via `.maybeSingle()` — if null, `return Astro.redirect('/campaigns')`. Query `npcs` where `campaign_id = id` ordered by `created_at desc`. Render the campaign header (name, description, "Edit campaign" link to `/campaigns/[id]/edit`, "← Campaigns" back link) and a "+ New NPC" link to `/campaigns/[id]/npcs/new`, then `<NpcList initialNpcs={npcs} campaignId={id} client:load />`. Follow the layout/styling of `src/pages/campaigns/index.astro`.

#### 2. New NPC page

**File**: `src/pages/campaigns/[id]/npcs/new.astro` (create)

**Intent**: Page wrapper for the create-mode NPC form.

**Contract**: Frontmatter auth guard (`createClient`; redirect if null) and extract `id` from `Astro.params` (redirect to `/campaigns` if missing). Verify the campaign is owned via an RLS-scoped `select id from campaigns where id = id` `.maybeSingle()` and redirect to `/campaigns` if null — consistent with every other protected page and prevents rendering a form the user can't submit. Render `<NpcForm campaignId={id} client:load />`. Include a "← Back" link to `/campaigns/[id]`. Title: "New NPC". Mirror the card/layout chrome of `src/pages/campaigns/[id]/edit.astro`.

#### 3. NPC detail page (read view)

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro` (create)

**Intent**: Static SSR read view of a single NPC — name, role, full traits — with Edit and Back links. (This is the surface S-04's AI query will later attach to.)

**Contract**: In frontmatter, `createClient` (redirect if null); extract `id` and `npcId` from `Astro.params`. Query `npcs` where `id = npcId` via `.maybeSingle()` — if null (not found or RLS-rejected), `return Astro.redirect('/campaigns/${id}')`. Render name, role (or "No role" placeholder), and full `traits` (preserve line breaks; "No traits" placeholder when null). Include an "Edit" link to `/campaigns/[id]/npcs/[npcId]/edit` and a "← Back" link to `/campaigns/[id]`. No island — this page is read-only; delete happens from the list card.

#### 4. Edit NPC page

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/edit.astro` (create)

**Intent**: Fetch the specific NPC server-side and render the edit-mode form.

**Contract**: In frontmatter, `createClient` (redirect if null); extract `id` and `npcId`. Query `npcs` where `id = npcId` via `.maybeSingle()`; if null, `return Astro.redirect('/campaigns/${id}')`. Render `<NpcForm campaignId={id} npc={npc} client:load />` with the same card chrome as `src/pages/campaigns/[id]/edit.astro`. Include a "← Back" link to `/campaigns/[id]`.

#### 5. Campaign card → detail navigation

**File**: `src/components/campaigns/CampaignCard.tsx` (edit)

**Intent**: Make the campaign card title navigate to the new campaign detail page so the user can reach a campaign's NPCs.

**Contract**: Wrap the campaign name (`CampaignCard.tsx:47`) in an `<a href={/campaigns/${campaign.id}}>` (hover styling consistent with existing links). Leave the Edit/Archive/Delete action row and the two-click confirm logic unchanged so `CampaignCard.test.tsx` continues to pass.

### Success Criteria:

#### Automated Verification:

- `npm run build` completes with no errors
- `npm run lint` passes across all changed files
- `npm run test` — existing `CampaignCard.test.tsx` still passes after the title-link change

#### Manual Verification:

- Unauthenticated visit to `/campaigns/<id>` redirects to `/auth/signin`
- Clicking a campaign card title opens its detail page with the (initially empty) NPC roster
- Full create flow: "+ New NPC" → fill name/role/traits → submit → lands on the campaign detail page with the new NPC card visible
- Clicking an NPC card title opens the NPC detail read view showing role and full traits
- Full edit flow: Edit on a card → form pre-filled → change role → save → updated card on the campaign detail page
- Two-click delete removes the NPC card from the list; direct DB query confirms the row is gone
- Deleting the parent campaign removes its NPCs (cascade)
- Cross-account isolation: user B cannot open or see user A's campaign detail page or NPCs

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `NpcForm` — empty name rejected (no `fetch`); name > 200 and traits > 2000 rejected client-side; valid create posts to `/api/npcs` with `campaign_id`.
- `NpcCard` — two-click delete state machine (first click confirms, second fires `onDelete`, external click resets); title/Edit links resolve to the correct nested paths.

### Integration Tests:

- (Manual) `POST /api/npcs` with a valid owned campaign creates a row; a foreign `campaign_id` returns 404; missing name returns 400.
- (Manual) `DELETE /api/npcs/<id>` without a session returns 401; against another user's NPC returns 404.

### Manual Testing Steps:

1. Create a campaign, open its detail page, confirm the empty NPC state.
2. Add three NPCs with distinct names/roles; verify all appear as cards on the detail page.
3. Open one NPC's detail view; confirm role and full traits render.
4. Edit an NPC's role and traits; verify the card and detail view update.
5. Delete an NPC via two-click confirm; verify the card is removed and the DB row is gone.
6. Delete the parent campaign; verify its NPCs are cascade-deleted.
7. In an incognito window as a second account, confirm none of the first account's campaigns or NPCs are reachable.

## Performance Considerations

Small data volume (PRD: `data_volume: small`). The NPC list is a single indexed query by `campaign_id` per campaign detail page load — acceptable latency, no pagination needed. No caching layer at this scale.

## Migration Notes

Phase 1 adds the second migration (`20260604010000_create_npcs.sql`), ordered after the campaigns migration. Apply locally with `npx supabase db reset` (re-applies all migrations to the local stack). For production, apply via `npx supabase db push` or the Supabase dashboard SQL editor. The `moddatetime` extension is already present from the campaigns migration; the `create extension if not exists` re-issue is idempotent.

## References

- Roadmap slice: `context/foundation/roadmap.md` → S-02
- Sibling plan (template): `context/changes/campaigns-crud/plan.md`
- PRD functional requirements: FR-006, FR-007; recipe section (free-text traits); US-01 (NPC detail page)
- Migration pattern: `supabase/migrations/20260604000000_create_campaigns.sql`
- API pattern: `src/pages/api/campaigns/index.ts`, `src/pages/api/campaigns/[id].ts`
- Island pattern: `src/components/campaigns/{CampaignList,CampaignCard,CampaignForm}.tsx`
- Test pattern: `src/components/campaigns/{CampaignForm,CampaignCard}.test.tsx`
- Lessons: `context/foundation/lessons.md` (`.astro` SSR-redirect eslint rule — already configured)

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema

#### Automated

- [x] 1.1 Migration file exists at `supabase/migrations/20260604010000_create_npcs.sql` — f738424
- [x] 1.2 `npx supabase db reset` completes without error — f738424

#### Manual

- [x] 1.3 `npcs` table visible in Studio with all columns, FKs, and the `(campaign_id)` index — f738424
- [x] 1.4 RLS enabled; all four policies present with correct definitions — f738424
- [x] 1.5 Insert into own campaign succeeds; insert with a foreign `campaign_id` is RLS-rejected — f738424
- [x] 1.6 Deleting a campaign cascade-deletes its NPCs — f738424
- [x] 1.7 Cross-account isolation verified (user B sees none of user A's NPCs) — f738424

### Phase 2: Types & API Routes

#### Automated

- [x] 2.1 `npm run lint` passes on all new files — 572359f
- [x] 2.2 `npm run build` emits no TypeScript errors on new files — 572359f

#### Manual

- [x] 2.3 POST /api/npcs into an owned campaign returns 201 with the NPC — 572359f
- [x] 2.4 POST /api/npcs with a foreign `campaign_id` returns 404 — 572359f
- [x] 2.5 PATCH /api/npcs/<id> updates and returns the NPC — 572359f
- [x] 2.6 DELETE /api/npcs/<id> removes the row — 572359f
- [x] 2.7 PATCH/DELETE against another user's NPC returns 404 — 572359f
- [x] 2.8 Unauthenticated requests return 401 — 572359f

### Phase 3: React Components

#### Automated

- [x] 3.1 `npm run lint` passes on all new files — 6ac48a2
- [x] 3.2 `npm run build` emits no TypeScript errors — 6ac48a2
- [x] 3.3 `npm run test` — `NpcForm.test.tsx` and `NpcCard.test.tsx` pass — 6ac48a2

#### Manual

- [x] 3.4 NpcForm renders name/role/traits in create mode — 6ac48a2
- [x] 3.5 NpcForm pre-fills all three fields in edit mode — 6ac48a2
- [x] 3.6 NpcCard shows name, role, truncated traits, with title + Edit links and Delete — 6ac48a2
- [x] 3.7 Two-click delete confirm works and resets on external click — 6ac48a2
- [x] 3.8 NpcList shows the empty-state CTA when given an empty array — 6ac48a2

### Phase 4: Pages & Navigation

#### Automated

- [x] 4.1 `npm run build` completes with no errors
- [x] 4.2 `npm run lint` passes across all changed files
- [x] 4.3 `npm run test` — existing `CampaignCard.test.tsx` still passes

#### Manual

- [x] 4.4 Unauthenticated /campaigns/<id> redirects to /auth/signin
- [x] 4.5 Clicking a campaign card title opens its detail page with the NPC roster
- [x] 4.6 Full create flow works end-to-end (lands on campaign detail with new NPC)
- [x] 4.7 NPC detail read view shows role and full traits
- [x] 4.8 Full edit flow works end-to-end
- [x] 4.9 Two-click delete removes the NPC from list and DB
- [x] 4.10 Deleting the parent campaign cascade-deletes its NPCs
- [x] 4.11 User B cannot reach User A's campaign detail page or NPCs
