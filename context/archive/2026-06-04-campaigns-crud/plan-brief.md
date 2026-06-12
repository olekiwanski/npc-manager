# Campaigns CRUD — Plan Brief

> Full plan: `context/changes/campaigns-crud/plan.md`

## What & Why

Deliver the first user-visible product slice: campaign management (create, view, edit, archive, delete). This is the prerequisite for all NPC work downstream and the first real test of the RLS data isolation that the product's security model depends on. The plan folds the database schema work (F-01) into Phase 1 since no migrations exist yet.

## Starting Point

Auth is fully working (middleware, SSR Supabase client, signin/signup/signout). The `/dashboard` page is a placeholder stub. No product tables, API routes, or types exist yet — the database is empty.

## Desired End State

A logged-in GM lands on `/campaigns`, sees a cards grid of their campaigns, and can create, edit, archive, and delete them. `/dashboard` redirects to `/campaigns`. All campaign data is RLS-isolated per user. The Topbar links to Campaigns instead of Dashboard.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| F-01 scope | Fold DB schema into Phase 1 | No migrations exist; this plan needs the table before anything else can be tested | Plan |
| API style | JSON REST (fetch + JSON) | Inline error handling in React components; no page reloads on mutations | Plan |
| Form placement | Separate pages (/campaigns/new, /campaigns/[id]/edit) | Simple routing, deep-linkable, matches Astro's server-first model | Plan |
| Post-login landing | /campaigns replaces /dashboard | Campaigns list IS the product home — no stub left in the app | Plan |
| Campaign fields | name + description + status (active/archived) | name + description from FR-003; status added to enable archive-vs-delete UX | Plan |
| Delete/archive UX | Inline two-click confirm | No modal dependency; fast to implement; status archive is a safe alternative to destructive delete | Plan |
| List layout | Cards grid | User choice | Plan |
| Initial data loading | SSR in Astro frontmatter, passed as props | No mount-time fetch flash; consistent with Astro server-first pattern | Plan |

## Scope

**In scope:**
- `supabase/migrations/` first migration — campaigns table + RLS (four per-operation policies)
- `src/types.ts` — Campaign type and DTOs
- `GET /api/campaigns`, `POST /api/campaigns`, `PATCH /api/campaigns/[id]`, `DELETE /api/campaigns/[id]`
- `CampaignCard`, `CampaignList`, `CampaignForm` React islands
- `/campaigns`, `/campaigns/new`, `/campaigns/[id]/edit` Astro pages
- Middleware update (add /campaigns to PROTECTED_ROUTES)
- Topbar update (Dashboard → Campaigns link)
- /dashboard → /campaigns redirect

**Out of scope:**
- NPCs, relationships, AI reaction (S-02 through S-04)
- Campaign detail/view page (comes with S-02)
- Pagination, search, or filter beyond active/archived toggle
- Supabase generated TypeScript types

## Architecture / Approach

Astro SSR pages fetch data server-side in frontmatter using the existing `createClient()` helper and pass results as props to React islands. Islands hold the data in `useState` and call JSON REST API routes for mutations (archive, delete, create, edit) — no full-page reload needed. The `FormField`, `SubmitButton`, and `ServerError` components from `src/components/auth/` are reused in `CampaignForm`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Database Schema | campaigns table + RLS in Supabase migration | RLS policy misconfiguration could expose cross-account data |
| 2. Types & API Routes | Full REST backend contract: list, create, update, delete | `prerender = false` missing causes silent build failure on Cloudflare |
| 3. React Components | CampaignForm, CampaignCard, CampaignList islands | Two-click confirm state reset on external click |
| 4. Pages & Navigation | End-to-end working flow; Topbar and routing updated | First real auth-gated product route test; session not resolving correctly would block all pages |

**Prerequisites:** Local Supabase stack running (`npx supabase start`); Supabase credentials in `.dev.vars`
**Estimated effort:** ~2–3 sessions across 4 phases

## Open Risks & Assumptions

- Local Supabase stack must be running for Phase 1 testing — assumes Docker is available
- No existing shadcn/ui `Dialog` component; the inline two-click confirm avoids that dependency
- `CampaignList` filter toggle fetches archived campaigns from the API on demand — if the user has a large number of archived campaigns this could be slow, but at MVP scale (`data_volume: small`) it's acceptable

## Success Criteria (Summary)

- A logged-in GM can complete the full CRUD loop: create → list → edit → archive → delete
- A second logged-in user cannot see the first user's campaigns (RLS verified)
- `npm run build` passes with no errors on the completed implementation
