---
date: 2026-06-04T00:00:00Z
researcher: ArrogantPigeon
git_commit: a43d572167bff0656d69056fda3150320629b82e
branch: master
repository: olekiwanski/npc-manager
topic: "S-04 npc-ai-reaction — in-character AI reaction query (streamed) for a single NPC"
tags: [research, codebase, ai-reaction, streaming, supabase, astro, cloudflare-workers]
status: complete
last_updated: 2026-06-04
last_updated_by: ArrogantPigeon
---

# Research: S-04 `npc-ai-reaction` — streamed in-character AI reaction query

**Date**: 2026-06-04
**Researcher**: ArrogantPigeon
**Git Commit**: a43d572167bff0656d69056fda3150320629b82e
**Branch**: master
**Repository**: olekiwanski/npc-manager

## Research Question

Gather the internal-codebase evidence needed to plan **S-04 (`npc-ai-reaction`)** — the roadmap north star. A GM opens an NPC's detail page, submits a natural-language scenario ("How would [NPC] react to X?"), and receives a **streamed** in-character AI response that references the NPC's role, traits, and known relationships, with visible feedback within 2 seconds (FR-010 / US-01). User-prioritized focus: **data & context assembly** and the **AI client abstraction**; comprehensive depth across API/streaming and UI as well.

## Summary

The codebase is well-positioned for this slice. Every layer the feature touches already has a clear convention to mirror, and the one genuinely net-new piece (the AI client + streaming) has no conflicting prior art.

Key conclusions:

1. **Data is ready.** NPC profile (`name`, `role`, `traits`) and relationships (`npc_has_npc`, directed `from`/`to` with `type` + `description`) exist with RLS. The relationship fetch pattern that S-03 established — `.or(from_npc_id.eq.X, to_npc_id.eq.X)` plus client-side name resolution against the campaign roster — is the template for assembling AI context. Related-NPC names are **not** joined server-side; they're resolved from the roster.
2. **AI client is net-new and must be built.** No AI SDK is installed. The `src/lib/supabase.ts` factory (typed `astro:env/server` secrets, returns `null` when unconfigured) is the exact template for an `AiClientInterface` factory. Recommended home: `src/lib/ai/`. Config presence should plug into the existing `config-status.ts` → `Layout.astro` banner pattern for free.
3. **API conventions are uniform and strict.** All routes: `export const prerender = false`, uppercase named handlers, inline zod `safeParse`, `{ data }` / `{ error }` response shape, a local `json()` helper, three-layer auth (middleware populates `locals.user`; route 401-guards; RLS + explicit ownership re-check). The new endpoint must self-guard — `/api/*` is **not** in `PROTECTED_ROUTES`.
4. **Streaming is supported but unprecedented here.** Astro 6.3.1 + `@astrojs/cloudflare` 13.5.2 + `nodejs_compat` support returning a `ReadableStream` `Response`. No existing SSE/stream code exists on either server or client — both ends are net-new. Cloudflare CPU-time accounting (infrastructure.md) means the LLM network await is free, but SSE forwarding + SSR count.
5. **UI conventions are consistent.** NPC detail page mounts React islands with `client:load`; forms use local `useState` + `fetch` + inline `<textarea className={cn(...)}>` (no shadcn textarea exists — only `button.tsx`). The frosted-glass card pattern (`rounded-2xl border border-white/10 bg-white/10 p-8 ... backdrop-blur-xl`) is the section wrapper. Streaming consumption via `response.body.getReader()` is net-new.

## Detailed Findings

### Area 1 — Data model & context assembly (focus)

**Schema** (`supabase/migrations/`):

- `campaigns` — `20260604000000_create_campaigns.sql:7-15`: `id`, `user_id` (FK `auth.users` cascade), `name`, `description`, `status` (`active`/`archived`), timestamps. RLS: per-op `*_own` policies scoped to `auth.uid() = user_id` (lines 30-53).
- `npcs` — `20260604010000_create_npcs.sql:10-19`: `id`, `user_id`, `campaign_id` (FK cascade), `name` (not null), `role` (nullable), `traits` (nullable), timestamps. RLS lines 33-62; insert policy also validates campaign ownership via subquery.
- `npc_has_npc` (relationships) — `20260604020000_create_npc_has_npc.sql:8-19`: `id`, `user_id`, `campaign_id`, `from_npc_id` + `to_npc_id` (both FK `npcs` **on delete cascade**), `type` (**not null**), `description` (nullable), `created_at` (no `updated_at` — relationships are immutable). `check (from_npc_id <> to_npc_id)`. Insert RLS (lines 39-54) enforces owner + campaign ownership + both NPCs in the same campaign. Indexes on both endpoints (lines 23-24).

**Shared types** (`src/types.ts`): `Campaign` (4-12), `Npc` (28-37), `Relationship` (59-68). DTO convention: `Create*` / `Update*` prefixes; **no `UpdateRelationshipDto`** (immutable). DB rows map 1:1 to entity interfaces.

**Data-access pattern**:
- Supabase client factory: `src/lib/supabase.ts:5-24` — `createClient(requestHeaders, cookies)`, cookie-based SSR auth, returns `null` if env missing.
- Fetch single NPC (page): `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:18` — `.from("npcs").select("*").eq("id", npcId).maybeSingle()`.
- Fetch an NPC's relationships (the **S-03 pattern to reuse**): `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:30-35`:
  ```ts
  supabase.from("npc_has_npc").select("*")
    .or(`from_npc_id.eq.${npcId},to_npc_id.eq.${npcId}`)
    .order("created_at", { ascending: true })
  ```
- Related-NPC **names are resolved client-side**, not via SQL join. The page also loads the full campaign roster (`.eq("campaign_id", id).order("name")`, line 25) and `RelationshipSection.tsx:39-41` resolves names with `nameFor(id)` against that roster.

**Context-assembly implication**: To build the LLM context for one NPC, fetch the NPC, fetch its relationships (`.or(...)`), then resolve partner names — either by extracting partner IDs and `.in("id", relatedIds)`, or by reusing the campaign roster. Shape to feed the prompt:
```
{ npc: Npc, relationships: Array<Relationship & { partnerNpc: Pick<Npc,'name'|'role'> }> }
```
Relationships **enrich, not gate** (US-01 AC) — an NPC with zero relationships must still produce a response.

**Cascade**: deleting an NPC cascades to every `npc_has_npc` row on either endpoint; deleting a campaign cascades to NPCs then relationships. No orphan rows possible.

### Area 2 — AI client abstraction (focus)

**No AI SDK installed.** `package.json` has no `@anthropic-ai/sdk`, `ollama`, `openai`, or LangChain. Versions: `astro ^6.3.1`, `@astrojs/cloudflare ^13.5.2`, `react`/`react-dom ^19.2.6`. Node `.nvmrc` = `22.14.0`. **`zod` is used (`src/pages/api/npcs/index.ts:2`) but is not a direct dependency** — it resolves transitively; add it explicitly if the AI layer uses it directly.

**Service template** (`src/lib/supabase.ts`): plain ESM, named factory export, reads `import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server"` (line 3), returns `null` when unconfigured (6-8) rather than throwing. Callers null-check and 401. **An `AiClientInterface` factory should mirror this contract exactly.**

**Recommended layout** (consistent with `AGENTS.md` "services in `src/lib/`"): `src/lib/ai/` with `interface.ts` (`AiClientInterface` + DTOs), `ollama.ts`, `anthropic.ts`, `index.ts` exporting `createAiClient()` that selects `AnthropicClient` when `ANTHROPIC_API_KEY` is present, else `OllamaClient` via `OLLAMA_BASE_URL`, else `null`.

**Env wiring** (`astro.config.mjs:17-22`): the `astro:env` `schema` block is the single source of truth. `envField` imported at line 2. Add:
```js
ANTHROPIC_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
OLLAMA_BASE_URL: envField.string({ context: "server", access: "public", optional: true, default: "http://127.0.0.1:11434" }),
```
`optional: true` enables the graceful-null pattern. `src/env.d.ts` only declares `App.Locals.user` — env vars are auto-typed, no change needed. Add the keys to `.env.example` and `.dev.vars` (local workerd dev).

**Config-status integration** (`src/lib/config-status.ts:1-21`): exports `configStatuses[]` and derived `missingConfigs`. `Layout.astro:4,22-37` maps each missing config to an error `<Banner>`. Adding an `"AI"` entry (`configured: Boolean(ANTHROPIC_API_KEY || OLLAMA_BASE_URL)`) auto-surfaces a banner with **no UI change**.

**Cloudflare** (`wrangler.jsonc`): `compatibility_date 2026-05-08`, `compatibility_flags ["nodejs_compat"]`. No `vars`/`[env]` block — secrets flow only through `astro:env`, backed by Workers Secrets (`wrangler secret put`). **Prefer `fetch` to the Anthropic/Ollama REST endpoints** over the Node SDK to minimize bundle/compat risk on Workers. **`OllamaClient` is inherently dev-only** (localhost unreachable from deployed Workers) — `AnthropicClient` is the prod path, matching the intended split.

**Testing note**: `vitest.config.ts:11` excludes `supabase.ts` + `config-status.ts` from coverage (they import `astro:env`). New `src/lib/ai/*` importing `astro:env/server` will need the same exclusion or env mocking.

### Area 3 — API route & streaming conventions

**Uniform route shape** (`src/pages/api/npcs/index.ts`, `npcs/[id].ts`, `campaigns/index.ts`, `campaigns/[id].ts`):
- `export const prerender = false`.
- Local helper: `const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })`.
- Auth guard: `const supabase = createClient(...); const user = context.locals.user; if (!supabase || !user) return json(401, ...)`.
- Body parse → `try { body = await context.request.json() } catch { return json(400, ...) }`.
- Inline zod `createSchema.safeParse(body)`; error → `json(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" })`.
- Ownership re-check: RLS-scoped `select(...).maybeSingle()`; empty ⇒ `404` (defense-in-depth comment at `npcs/index.ts:44-51`).
- Response shape: `{ data: T }` (success) / `{ error: string }` (failure). Codes: 201 POST, 200 others, 400/401/404/500.

**Middleware** (`src/middleware.ts`, full 25 lines): populates `context.locals.user` via `supabase.auth.getUser()` on every request; `PROTECTED_ROUTES = ["/dashboard", "/campaigns"]` redirect-guards pages. **`/api/*` is not protected by middleware — endpoints self-guard with the 401 pattern.**

**Zod schema to mirror** (`npcs/index.ts:14-19`) → proposed scenario-query schema:
```ts
const reactionQuerySchema = z.object({
  scenario: z.string().min(1, "Scenario is required").max(2000, "Scenario must be 2000 characters or fewer"),
});
```
(NPC id comes from the route param; campaign ownership re-checked server-side.)

**Streaming**: No `ReadableStream` / `text/event-stream` / SSE anywhere in `src/` today. Astro 6.3.1 + `@astrojs/cloudflare` 13.5.2 + `nodejs_compat` support returning `new Response(stream, { headers: { "Content-Type": "text/event-stream" } })`. Suggested endpoint: `src/pages/api/npcs/[id]/reaction.ts` (or `.../ask.ts`) — same auth + ownership guards, then a `ReadableStream` whose `start(controller)` forwards LLM chunks as SSE frames and `controller.close()`s. Per infrastructure.md, the LLM await is free against Workers CPU limits; SSE forwarding is not.

### Area 4 — React island & NPC detail UI

**NPC detail page** (`src/pages/campaigns/[id]/npcs/[npcId]/index.astro`): frontmatter auth + RLS fetch of NPC (7-22), campaign roster (25-26), relationships (30-35). Mounts `<RelationshipSection ... client:load />` (83-89). Section wrapper card: `mt-6 rounded-2xl border border-white/10 bg-white/10 p-8 text-white backdrop-blur-xl` (line 81). New "Ask AI" island/section goes after the relationships section (~after line 90).

**Form/island pattern** (`src/components/npcs/NpcForm.tsx`): local `useState` per field + `errors` + `serverError` (24-28); `handleSubmit` (48-78) does `fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) })`, `if (!res.ok)` reads `{ error }`, else redirects. Inline textarea (112-126) with `cn(...)` conditional error border. **No shadcn textarea exists** — only `src/components/ui/button.tsx` (cva variants, 7-33). A textarea can stay inline (existing convention) or be added via `npx shadcn@latest add textarea`.

**Loading feedback** (`src/components/auth/SubmitButton.tsx`): React 19 `useFormStatus()` → `pending`; spinner `size-4 animate-spin rounded-full border-2 border-white/30 border-t-white`. `ServerError.tsx` renders error banner. This is the source of the <2s visible feedback (spinner shows on submit; streamed tokens then begin rendering).

**Stream consumption (net-new)**: no `getReader`/`EventSource` in components. Pattern to introduce:
```ts
const res = await fetch(`/api/npcs/${npcId}/reaction`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ scenario }) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
for (;;) { const { done, value } = await reader.read(); if (done) break; setResponse(prev => prev + decoder.decode(value)); }
```

**Styling conventions**: cosmic bg, frosted-glass cards, labels `mb-1 block text-sm text-blue-100/80`, section headers `text-sm font-semibold tracking-wide text-blue-100/60 uppercase`, focus ring `focus:ring-purple-400` (error `focus:ring-red-400`), section spacing `mt-6`, padding `p-8`.

## Code References

- `supabase/migrations/20260604000000_create_campaigns.sql:7-53` — campaigns table + RLS
- `supabase/migrations/20260604010000_create_npcs.sql:10-62` — npcs table + RLS (insert validates campaign ownership)
- `supabase/migrations/20260604020000_create_npc_has_npc.sql:8-60` — relationships table, directed FKs (cascade both sides), insert RLS triple-check
- `src/types.ts:4-77` — `Campaign`, `Npc`, `Relationship` + DTOs
- `src/lib/supabase.ts:1-24` — SSR client factory; **template for the AI client factory**
- `src/lib/config-status.ts:1-21` — config presence checks; add an `"AI"` entry here
- `src/layouts/Layout.astro:4,22-37` — auto-renders missing-config banners
- `astro.config.mjs:2,17-22` — `astro:env` schema; add `ANTHROPIC_API_KEY` / `OLLAMA_BASE_URL`
- `src/env.d.ts` — `App.Locals` only (no env-var changes needed)
- `wrangler.jsonc` — `nodejs_compat`; secrets via Workers Secrets, not this file
- `package.json` — no AI SDK; zod is transitive only; astro 6.3.1 / cloudflare 13.5.2 / react 19.2.6
- `src/middleware.ts:1-25` — `locals.user`, `PROTECTED_ROUTES` (no `/api/*`)
- `src/pages/api/npcs/index.ts:8-70` — full route convention (json helper, zod, auth, ownership, response shape)
- `src/pages/api/npcs/[id].ts:44-52` — single-resource ownership-via-RLS pattern
- `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:7-89` — detail page data loads + island mount
- `src/components/npcs/NpcForm.tsx:24-126` — island state + fetch submit + inline textarea
- `src/components/npcs/RelationshipSection.tsx:39-41,214-215` — client-side partner-name resolution
- `src/components/auth/SubmitButton.tsx:1-33` — `useFormStatus` pending spinner (<2s feedback)
- `src/components/ui/button.tsx:7-33` — only shadcn primitive present (cva variants)
- `vitest.config.ts:11` — coverage exclusions for `astro:env`-importing lib modules

## Architecture Insights

- **Graceful-null service contract**: services return `null` when unconfigured; callers degrade (401 / config banner) instead of crashing. Apply to the AI client so a missing key disables the feature cleanly rather than 500-ing.
- **Defense in depth on ownership**: RLS + an explicit `.maybeSingle()` 404 check at the route. The reaction endpoint must honor this before spending an LLM call.
- **Names resolved in JS, not SQL**: relationships return raw IDs; partner names come from the campaign roster. Context assembly should follow the same approach rather than introducing a server-side join.
- **Inline UI primitives**: textarea/input/label are inline `<… className={cn(...)}>`, not shadcn components. Match this unless deliberately extracting a `ui/textarea.tsx`.
- **Streaming is the single highest-risk net-new element** (roadmap S-04 risk note): no prior art server- or client-side, plus Cloudflare CPU-time nuances. Worth a focused spike during planning.

## Historical Context (from prior changes)

- `context/foundation/shape-notes.md:141-143` — design constraint: `AiClientInterface` with `OllamaClient` (dev) + `AnthropicClient` (prod), identical behavior, latency the only user-visible difference.
- `context/foundation/prd.md` FR-010, US-01, Business Logic — single-NPC scenario query, profile + relationships as context, **no state mutation** on query, re-query allowed; NFR: visible feedback within 2s.
- `context/foundation/infrastructure.md:63,71,93` — Workers CPU-time: Anthropic await is free, SSE forwarding/SSR are not; streaming interaction flagged as a pre-mortem risk. Anthropic key as Workers Secret.
- `context/foundation/roadmap.md:104-115` — S-04 is the north star; prerequisite S-03 done; unknown: Anthropic key must exist at deploy (owner: user, non-blocking for planning).
- `context/foundation/lessons.md` — `.astro` SSR redirect lint rule (relevant if the detail page gains a frontmatter `return`); feature-flag kill-date rule (relevant if AI is flagged).

## Related Research

None — this is the first research artifact for `npc-ai-reaction`. Prior slices (`campaigns-crud`, `npc-crud`, `npc-relationships`) are merged (PRs #1–#3); `npc-relationships` awaits `/10x-archive`.

## Open Questions

1. **Streaming protocol**: raw chunked text vs framed SSE (`data: …\n\n`)? Affects both endpoint and client reader. (Planning decision; SSE is the more standard fit for the 2s-feedback NFR.)
2. **Endpoint shape**: `POST /api/npcs/[id]/reaction` (NPC id in path) vs a body-carried id. Path-param matches existing `[id]` convention.
3. **External research still needed** (out of scope for this internal pass, but required before `/10x-plan` finalizes): current Anthropic Messages **streaming** API shape and the Ollama streaming endpoint contract — pull live via Context7 (`@anthropic-ai/sdk` or REST) and exa.ai for Workers-on-fetch streaming best practices. Decide SDK-vs-`fetch` (this research leans `fetch` for Workers).
4. **Prompt/system-prompt design**: how NPC traits + relationships are templated into the prompt — a planning concern, not a codebase fact.
5. **zod as explicit dependency**: add to `package.json` if the AI/validation layer imports it directly (currently transitive).
