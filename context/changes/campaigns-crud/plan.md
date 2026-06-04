# Campaigns CRUD Implementation Plan

## Overview

Deliver the first user-visible product slice: a GM can create, view, edit, archive, and delete their own campaigns. This plan folds the database schema work (F-01 for campaigns) into Phase 1, since no migrations exist yet. The result is a fully working campaigns management section that replaces the `/dashboard` stub as the authenticated landing page.

## Current State Analysis

- **Auth**: fully working — middleware populates `context.locals.user`; SSR Supabase client at `src/lib/supabase.ts`
- **DB**: no migrations directory; no product tables; `supabase/config.toml` has `schema_paths=[]`
- **API routes**: only auth endpoints exist (`src/pages/api/auth/`); no product endpoints
- **Pages**: `/dashboard.astro` is the only protected page — a placeholder stub
- **Components**: `FormField`, `SubmitButton`, `ServerError` from `src/components/auth/` are reusable; only `button.tsx` from shadcn/ui is installed
- **Types**: `src/types.ts` does not exist yet
- **Topbar**: shows Dashboard link when authenticated; needs updating to Campaigns

## Desired End State

A logged-in GM lands on `/campaigns`, sees a cards grid of their campaigns (empty state for new accounts), and can create, edit, archive, and delete campaigns. All routes under `/campaigns` are auth-gated. The `/dashboard` route redirects to `/campaigns`. Campaign data is fully isolated per user via RLS — no query returns another account's data.

### Key Discoveries:

- `src/lib/supabase.ts` exports `createClient(requestHeaders, cookies)` — the exact same call works in both API route handlers and Astro page frontmatter (`Astro.request.headers`, `Astro.cookies`)
- AGENTS.md requires `export const prerender = false` on every API route file — missing it causes a Cloudflare Workers build failure
- AGENTS.md requires per-operation, per-role RLS policies — one policy per SQL operation (SELECT / INSERT / UPDATE / DELETE), not a single "all" policy
- Auth pattern in Topbar (`src/components/Topbar.astro`) renders nav links conditionally on `Astro.locals.user`; updating the Dashboard link covers the nav change

## What We're NOT Doing

- No campaign detail/view page — that comes with S-02 (NPC CRUD)
- No schema for NPCs or relationships — those belong to later slices
- No Supabase generated TypeScript types — handwritten types in `src/types.ts` are sufficient for MVP
- No pagination or search on the campaigns list (PRD Non-Goals)
- No campaign sharing, status beyond active/archived, or extra metadata fields

## Implementation Approach

Four sequential phases: schema first (nothing else works without it), then API routes and types (backend contract established), then React island components (client-side behavior), then Astro pages and navigation (wires everything together and makes it end-to-end testable).

API routes follow JSON REST (not form-redirect): React islands call endpoints with `fetch`, handle responses inline, and navigate on success. Astro pages fetch data server-side in frontmatter and pass it as props to React islands — no client-side fetch on mount for initial data.

## Critical Implementation Details

**SSR data flow — do not fetch on mount**: `src/pages/campaigns/index.astro` queries Supabase in its frontmatter and passes `campaigns` as a prop to the `CampaignList` island. The island stores them in `useState(initialCampaigns)`. Archive and delete actions mutate that local state via `fetch` calls to the API. Do NOT call the list API from inside the island on mount — that causes a flash of empty state and duplicates the SSR work.

**`prerender = false` is required on every API route**: every file under `src/pages/api/` must have `export const prerender = false` as a top-level export. Without it the Cloudflare Workers adapter treats the route as a static export and the build fails.

---

## Phase 1: Database Schema

### Overview

Create the `campaigns` table with RLS enabled and per-operation policies. This unblocks all subsequent phases. The migration must be applied locally (`npx supabase db reset` or `npx supabase migration up`) before Phase 2 can be tested.

### Changes Required:

#### 1. Supabase migration file

**File**: `supabase/migrations/20260604000000_create_campaigns.sql`

**Intent**: Create the campaigns table and enable Row Level Security with four per-operation policies so that every database operation is isolated to the authenticated user.

**Contract**: The table must have these columns — `id` (uuid primary key, default `gen_random_uuid()`), `user_id` (uuid not null, foreign key to `auth.users(id)` with on-delete cascade), `name` (text not null), `description` (text, nullable), `status` (text not null, default `'active'`, check constraint: `status in ('active', 'archived')`), `created_at` (timestamptz not null, default `now()`), `updated_at` (timestamptz not null, default `now()`). A before-update trigger must keep `updated_at` current — enable the `moddatetime` extension (`create extension if not exists moddatetime`) and attach a `before update` trigger calling `moddatetime(updated_at)`. RLS enabled with four policies named `campaigns_select_own`, `campaigns_insert_own`, `campaigns_update_own`, `campaigns_delete_own`, each scoped to the `authenticated` role. Clause types per operation (Postgres requirement — INSERT rejects `USING`): `campaigns_select_own` → `USING (auth.uid() = user_id)`; `campaigns_insert_own` → `WITH CHECK (auth.uid() = user_id)`; `campaigns_update_own` → both `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`; `campaigns_delete_own` → `USING (auth.uid() = user_id)`.

### Success Criteria:

#### Automated Verification:

- Migration file exists at the correct path and filename
- `npx supabase db reset` completes without error

#### Manual Verification:

- Supabase Studio shows the `campaigns` table with all columns and constraints
- RLS is enabled on the table (visible in Table Editor → RLS panel)
- All four policies are present with correct definitions
- Creating a campaign as user A and querying as user B returns no rows

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Types & API Routes

### Overview

Define the `Campaign` type and DTOs in `src/types.ts`, then implement the REST endpoints. After this phase the full backend contract is in place and testable independently of the UI.

### Changes Required:

#### 1. Campaign types

**File**: `src/types.ts` (create)

**Intent**: Define the canonical `Campaign` entity and the DTOs used by API routes.

**Contract**:
- `Campaign` — mirrors the DB row: `{ id: string; user_id: string; name: string; description: string | null; status: 'active' | 'archived'; created_at: string; updated_at: string; }`
- `CreateCampaignDto` — `{ name: string; description?: string | null; }`
- `UpdateCampaignDto` — `{ name?: string; description?: string | null; status?: 'active' | 'archived'; }`

#### 2. Campaigns list + create endpoint

**File**: `src/pages/api/campaigns/index.ts` (create)

**Intent**: Handle listing the authenticated user's campaigns (GET) and creating a new campaign (POST).

**Contract**:
- `export const prerender = false` at the top
- `GET` handler — accepts optional `?status=` query param (values: `active`, `archived`; defaults to `active`). Queries `campaigns` table filtered by `auth.uid()` (RLS handles this automatically) and the requested status. Returns `200 { data: Campaign[] }`. Returns `401 { error: 'Unauthorized' }` if no authenticated user.
- `POST` handler — reads JSON body, validates with zod: `name` (string, min 1, max 200), `description` (string, max 1000, optional). Inserts with `user_id` set to the authenticated user's ID, chaining `.select().single()` so the inserted row is returned (supabase-js returns no row without `.select()`). Returns `201 { data: Campaign }` on success; `400 { error: string }` on validation failure; `401` if unauthenticated.

#### 3. Campaign update + delete endpoint

**File**: `src/pages/api/campaigns/[id].ts` (create)

**Intent**: Handle editing a campaign's fields (PATCH) and deleting it (DELETE). Both operations are ownership-checked — a user cannot mutate another user's campaigns.

**Contract**:
- `export const prerender = false` at the top
- `PATCH` handler — reads JSON body, validates with zod: `name` (string, min 1, max 200, optional), `description` (string, max 1000, optional), `status` (`'active' | 'archived'`, optional). Updates the matching campaign row where `id = params.id` (RLS on UPDATE already enforces ownership), chaining `.select()` so affected rows are observable. Returns `200 { data: Campaign }` on success; `400` on validation failure; `401` if unauthenticated; `404 { error: 'Not found' }` when the result set is empty (no matching row, or RLS rejected the ownership check).
- `DELETE` handler — deletes the campaign where `id = params.id` (RLS on DELETE enforces ownership), chaining `.select()` so the deleted row is observable. Returns `200 { data: { id: string } }` on success; `401` if unauthenticated; `404` when the result set is empty (no matching row, or RLS rejected the ownership check).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all new files
- TypeScript compilation (`npm run build`) emits no errors on the new files

#### Manual Verification:

- `GET /api/campaigns` with a valid session returns `{ data: [] }` for a new user
- `POST /api/campaigns` with `{ name: "Test" }` returns `201` with the created campaign
- `PATCH /api/campaigns/<id>` with `{ status: "archived" }` returns the updated campaign
- `DELETE /api/campaigns/<id>` returns `{ data: { id } }` and the row is gone
- Requests without a session return `401`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: React Components

### Overview

Build the three React island components that handle all client-side campaign interactions. They receive initial data as props from SSR and call the API routes for mutations.

### Changes Required:

#### 1. Campaign card

**File**: `src/components/campaigns/CampaignCard.tsx` (create)

**Intent**: Render a single campaign as a card with its name, description preview, status badge, and action buttons (Edit link, Archive/Unarchive button, Delete button). Archive and Delete use a two-click confirm pattern — first click enters a pending state, second click executes.

**Contract**:
```typescript
interface CampaignCardProps {
  campaign: Campaign;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}
```
The card tracks `confirmingAction: 'archive' | 'unarchive' | 'delete' | null` in local state. First click on a destructive action sets `confirmingAction`; second click calls the appropriate `on*` callback. Clicking elsewhere on the page (or another action) resets `confirmingAction`. Use `cn()` from `@/lib/utils` for class merging. Edit button is an `<a>` link to `/campaigns/[id]/edit`.

#### 2. Campaign list

**File**: `src/components/campaigns/CampaignList.tsx` (create)

**Intent**: Render the full campaigns management UI: cards grid, active/archived filter toggle, empty state, and orchestrate archive/delete mutations by calling the API and updating local state.

**Contract**:
```typescript
interface CampaignListProps {
  initialCampaigns: Campaign[];
}
```
Internal state: `campaigns` (starts from `initialCampaigns`), `showArchived: boolean` (starts `false`), `isLoading: boolean`. `initialCampaigns` is the SSR snapshot and must be treated as immutable — never repaint the active list directly from it after a mutation. When `showArchived` toggles to `true`, fetch `GET /api/campaigns?status=archived` and replace the displayed list. When toggling back to active, **re-fetch** `GET /api/campaigns?status=active` rather than restoring the immutable `initialCampaigns` ref — otherwise a campaign archived or deleted earlier in the session reappears in the active list. Archive and delete handlers call the API, then remove the campaign from the current list on success. Empty state shows a call-to-action link to `/campaigns/new`. Error from API calls displays inline above the grid using the existing `ServerError` component pattern (`src/components/auth/ServerError.tsx`).

#### 3. Campaign form

**File**: `src/components/campaigns/CampaignForm.tsx` (create)

**Intent**: Reusable create/edit form. In create mode it POSTs to `/api/campaigns`; in edit mode it PATCHes `/api/campaigns/[id]`. On success, navigates to `/campaigns`.

**Contract**:
```typescript
interface CampaignFormProps {
  campaign?: Campaign; // undefined = create mode
}
```
Fields: `name` (required text, max 200 chars), `description` (optional textarea, max 1000 chars), `status` (select: active / archived — shown only in edit mode). Reuse `FormField` from `src/components/auth/FormField.tsx` for the name field; add a plain `<textarea>` following the same Tailwind styling for description; use `SubmitButton` from `src/components/auth/SubmitButton.tsx` for the submit button. Validate client-side before submitting (name required, length limits). Show `ServerError` for API error responses. On success navigate to `/campaigns` via `window.location.href`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on all three new files
- TypeScript compilation emits no errors

#### Manual Verification:

- `CampaignForm` (create mode) renders with name + description fields; submit button is present
- `CampaignForm` (edit mode) pre-fills fields and shows status select
- `CampaignCard` shows name, truncated description, status badge, and three action areas
- Two-click confirm works: first click shows "Confirm?" state; second click fires the callback; click elsewhere resets
- `CampaignList` shows empty state when passed `[]`
- Filter toggle triggers archived fetch and swaps the displayed list

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Pages & Navigation

### Overview

Wire the components into Astro pages, protect the routes, and update navigation. This phase makes the full end-to-end flow testable in the browser.

### Changes Required:

#### 1. Middleware route protection

**File**: `src/middleware.ts`

**Intent**: Add `/campaigns` to the list of protected routes so all paths under `/campaigns` redirect unauthenticated users to `/auth/signin`.

**Contract**: Add `"/campaigns"` to the `PROTECTED_ROUTES` array. The existing `startsWith` check already covers all sub-paths (`/campaigns/new`, `/campaigns/[id]/edit`, etc.).

#### 2. Campaigns list page

**File**: `src/pages/campaigns/index.astro` (create)

**Intent**: Authenticated landing page for campaign management. Fetches the active campaigns server-side and passes them to the `CampaignList` island.

**Contract**: In frontmatter, create a Supabase client via `createClient(Astro.request.headers, Astro.cookies)`, query `campaigns` where `status = 'active'` ordered by `created_at desc`. Handle the null-client case (redirect to sign-in). Pass the resulting `Campaign[]` to `<CampaignList initialCampaigns={campaigns} client:load />`. Include a "New Campaign" link button to `/campaigns/new` in the page header.

#### 3. New campaign page

**File**: `src/pages/campaigns/new.astro` (create)

**Intent**: Page wrapper for the create-mode campaign form.

**Contract**: Minimal frontmatter (only auth guard — the middleware handles redirection, but confirm `Astro.locals.user` is non-null as a safety check). Render `<CampaignForm client:load />` with no `campaign` prop. Page title: "New Campaign".

#### 4. Edit campaign page

**File**: `src/pages/campaigns/[id]/edit.astro` (create)

**Intent**: Fetch the specific campaign server-side and render the edit-mode form. Return 404 if the campaign doesn't exist or belongs to another user.

**Contract**: In frontmatter, extract `id` from `Astro.params`, query `campaigns` where `id = params.id`. If `data` is null (not found or RLS rejected), redirect to `/campaigns`. Pass the campaign to `<CampaignForm campaign={campaign} client:load />`.

#### 5. Topbar navigation update

**File**: `src/components/Topbar.astro`

**Intent**: Replace the "Dashboard" nav link with "Campaigns" pointing to `/campaigns`.

**Contract**: Change the existing authenticated-user nav link from `href="/dashboard"` label "Dashboard" to `href="/campaigns"` label "Campaigns". Keep all other Topbar logic unchanged.

#### 6. Dashboard redirect

**File**: `src/pages/dashboard.astro`

**Intent**: Preserve the `/dashboard` URL without a dead page — redirect to `/campaigns`.

**Contract**: Replace the page content with an Astro redirect: `return Astro.redirect('/campaigns', 302)` in the frontmatter. Use 302 (not 301) — a permanent redirect is cached indefinitely by browsers, which would strand returning users if `/dashboard` ever becomes a real page again. Remove the old HTML body. Keep the file to avoid a 404 for any bookmarked or linked `/dashboard` URL.

### Success Criteria:

#### Automated Verification:

- `npm run build` completes with no errors
- `npm run lint` passes across all changed files

#### Manual Verification:

- Unauthenticated visit to `/campaigns` redirects to `/auth/signin`
- After sign-in, user lands on `/campaigns` (not `/dashboard`)
- Topbar shows "Campaigns" link for authenticated users
- Visiting `/dashboard` redirects to `/campaigns`
- Empty state: new user sees the empty-state CTA, not an error
- Full create flow: click "New Campaign" → fill form → submit → lands on `/campaigns` with the new card visible
- Full edit flow: click Edit on a card → form pre-filled → change name → save → updated card on list
- Archive flow: click Archive → "Confirm?" state → confirm → card disappears from active list; toggle shows archived → card appears
- Delete flow: two-click confirm removes card from list; direct DB query confirms row is gone
- Cross-account isolation: log in as user B and confirm user A's campaigns are not visible

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `CampaignForm` — validate that client-side validation catches: empty name, name over 200 chars, description over 1000 chars
- `CampaignCard` — confirm two-click confirm state machine: first click sets confirming state, second click fires callback, external click resets

### Integration Tests:

- `POST /api/campaigns` with valid body creates a row; with missing name returns 400
- `DELETE /api/campaigns/<id>` without session returns 401; with a different user's session returns 404

### Manual Testing Steps:

1. Register a fresh account; confirm the campaigns list shows the empty state
2. Create three campaigns with distinct names; verify all appear as cards
3. Archive one campaign; verify it disappears from the default list; toggle to archived and confirm it appears
4. Edit a campaign name and save; verify the card updates on the list
5. Delete a campaign via two-click confirm; verify the card is removed
6. Open a private/incognito window, log in as a second account, confirm none of the first account's campaigns are visible

## Performance Considerations

Small data volume (PRD: `data_volume: small`). No pagination needed for MVP. The SSR fetch on the campaigns list page is a single indexed query by `user_id` and `status` — acceptable latency. No caching layer needed at this scale.

## Migration Notes

Phase 1 creates the first migration. Apply locally with:
- `npx supabase start` (if not already running)
- `npx supabase db reset` (applies all migrations to the local stack)

For production, run `npx wrangler secret put` for Supabase credentials (already done in the deploy plan) and apply the migration to the cloud project via `npx supabase db push` or through the Supabase dashboard's SQL editor.

## References

- Roadmap slice: `context/foundation/roadmap.md` → S-01
- PRD functional requirements: FR-001 through FR-005
- Deploy plan: `context/changes/deployment/deploy-plan.md`
- Auth API pattern: `src/pages/api/auth/signin.ts`
- Middleware pattern: `src/middleware.ts`
- Supabase SSR client: `src/lib/supabase.ts`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema

#### Automated

- [x] 1.1 Migration file exists at correct path — d7fc269
- [x] 1.2 `npx supabase db reset` completes without error — d7fc269

#### Manual

- [x] 1.3 Campaigns table visible in Supabase Studio with all columns and constraints — d7fc269
- [x] 1.4 RLS enabled; all four policies present with correct definitions — d7fc269
- [x] 1.5 Cross-account isolation verified in Studio — d7fc269

### Phase 2: Types & API Routes

#### Automated

- [x] 2.1 `npm run lint` passes on all new files
- [x] 2.2 TypeScript compilation emits no errors on new files

#### Manual

- [x] 2.3 GET /api/campaigns returns `{ data: [] }` for a new user
- [x] 2.4 POST /api/campaigns creates a campaign and returns 201
- [x] 2.5 PATCH /api/campaigns/<id> updates and returns the campaign
- [x] 2.6 DELETE /api/campaigns/<id> removes the row
- [x] 2.7 Unauthenticated requests return 401

### Phase 3: React Components

#### Automated

- [ ] 3.1 `npm run lint` passes on all three new component files
- [ ] 3.2 TypeScript compilation emits no errors

#### Manual

- [ ] 3.3 CampaignForm renders correctly in create mode (name + description fields)
- [ ] 3.4 CampaignForm pre-fills and shows status select in edit mode
- [ ] 3.5 CampaignCard two-click confirm works for both Archive and Delete
- [ ] 3.6 CampaignList shows empty state when given an empty array
- [ ] 3.7 Filter toggle loads archived campaigns from API

### Phase 4: Pages & Navigation

#### Automated

- [ ] 4.1 `npm run build` completes with no errors
- [ ] 4.2 `npm run lint` passes across all changed files

#### Manual

- [ ] 4.3 Unauthenticated /campaigns redirects to /auth/signin
- [ ] 4.4 Post-login landing page is /campaigns
- [ ] 4.5 Topbar shows "Campaigns" link for authenticated users
- [ ] 4.6 /dashboard redirects to /campaigns (301)
- [ ] 4.7 Full create → list flow works end-to-end
- [ ] 4.8 Full edit flow works end-to-end
- [ ] 4.9 Archive and unarchive flow works with filter toggle
- [ ] 4.10 Two-click delete removes campaign from list and DB
- [ ] 4.11 User B cannot see User A's campaigns
