---
date: 2026-06-07T00:00:00+00:00
researcher: Claude Sonnet 4.6
git_commit: 95e433229c9921f2bd1308fe6058c8c1f5fcc87d
branch: HEAD
repository: npc-manager
topic: "SDK compatibility check: anthropic-ai-sdk.md vs codebase for S-04 implementation"
tags: [research, codebase, npc-ai-reaction, anthropic-sdk, streaming, cloudflare-workers, api-routes]
status: complete
last_updated: 2026-06-07
last_updated_by: Claude Sonnet 4.6
---

# Research: SDK compatibility check for S-04 (npc-ai-reaction)

**Date**: 2026-06-07  
**Researcher**: Claude Sonnet 4.6  
**Git Commit**: 95e433229c9921f2bd1308fe6058c8c1f5fcc87d  
**Branch**: HEAD  
**Repository**: npc-manager (olekiwanski)

## Research Question

Is `context/changes/npc-ai-reaction/anthropic-ai-sdk.md` compatible with this codebase for implementing S-04 (NPC AI reaction with streaming response)?

## Summary

**Verdict: Mostly compatible — one critical incompatibility, one missing prerequisite.**

The streaming architecture described in the SDK doc (SSE endpoint + ReadableStream + React reader) fits the codebase well. All infrastructure is in place. Two issues must be resolved before implementation:

1. **Critical incompatibility**: The doc uses `locals.runtime.env.ANTHROPIC_API_KEY`. This project uses `astro:env/server` imports — `locals.runtime` is not typed and not the project convention. Fix: add `ANTHROPIC_API_KEY` to `astro.config.mjs` env schema and import via `astro:env/server`.
2. **Missing prerequisite**: `@anthropic-ai/sdk` is not installed. Must `npm install @anthropic-ai/sdk` before implementation.

Everything else in the SDK doc aligns with codebase conventions.

---

## Detailed Findings

### A. Environment Variable Access — INCOMPATIBLE (fix required)

**SDK doc uses** (`anthropic-ai-sdk.md:81`):
```typescript
const client = new Anthropic({ apiKey: locals.runtime.env.ANTHROPIC_API_KEY });
```

**Project pattern** — all env vars are declared in `astro.config.mjs` and imported via `astro:env/server`:
- [`src/lib/supabase.ts:3`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/lib/supabase.ts#L3): `import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";`
- [`astro.config.mjs:17-22`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/astro.config.mjs#L17): env schema declaration using `envField.string({ context: "server", access: "secret" })`
- [`src/env.d.ts:1-5`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/env.d.ts#L1): `Locals` only declares `user` — no `runtime` property

**Required fix for implementation**:
```typescript
// astro.config.mjs — add to env.schema:
ANTHROPIC_API_KEY: envField.string({ context: "server", access: "secret" }),

// In the API route — use import instead of locals.runtime.env:
import { ANTHROPIC_API_KEY } from "astro:env/server";
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
```

---

### B. `@anthropic-ai/sdk` Not Installed — prerequisite missing

`package.json` has no `@anthropic-ai/sdk` entry. Must install before implementation:
```bash
npm install @anthropic-ai/sdk
```

---

### C. Streaming Response via `new Response(readable, {...})` — COMPATIBLE

All existing API routes return raw `new Response(...)` — this is already the project pattern, not an Astro helper:
- [`src/pages/api/campaigns/index.ts:8-12`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/api/campaigns/index.ts#L8): shared `json()` helper returning `new Response(JSON.stringify(body), {...})`

The same pattern extends naturally to `new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } })` as documented in the SDK doc.

---

### D. Cloudflare Workers Streaming Infrastructure — COMPATIBLE

- [`wrangler.jsonc:6`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/wrangler.jsonc#L6): `"compatibility_flags": ["nodejs_compat"]` — Web Fetch API enabled; `@anthropic-ai/sdk` uses Web Fetch natively
- [`astro.config.mjs:11`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/astro.config.mjs#L11): `output: "server"` — SSR API routes are enabled
- Web `ReadableStream` is native to Cloudflare Workers — no adapter needed

---

### E. API Route Structure — COMPATIBLE

All routes follow the pattern the SDK doc assumes:
- [`src/pages/api/campaigns/index.ts:1,4`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/api/campaigns/index.ts#L1): `import type { APIRoute } from "astro"` + `export const POST: APIRoute = async (context) => {...}`
- `export const prerender = false` — project hard rule (AGENTS.md)
- Auth check pattern: `const user = context.locals.user; if (!supabase || !user) return json(401, {...})`

The S-04 endpoint (`src/pages/api/npcs/[id]/reaction.ts`) will follow this exact structure.

---

### F. NPC & Relationship Data Shape for System Prompt

**`npcs` table** ([`supabase/migrations/20260604010000_create_npcs.sql:10-19`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/supabase/migrations/20260604010000_create_npcs.sql#L10)):

| Column | Type | Notes |
|--------|------|-------|
| `name` | text NOT NULL | Character name — always present |
| `role` | text NULL | Role/class/profession — may be null |
| `traits` | text NULL | Free-text personality/backstory — may be null |

**`npc_has_npc` table** ([`supabase/migrations/20260604020000_create_npc_has_npc.sql:8-19`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/supabase/migrations/20260604020000_create_npc_has_npc.sql#L8)):

| Column | Type | Notes |
|--------|------|-------|
| `from_npc_id` | uuid | Directed edge source |
| `to_npc_id` | uuid | Directed edge target |
| `type` | text NOT NULL | e.g. "ally", "enemy", "mentor" |
| `description` | text NULL | Optional context |

**TypeScript types** ([`src/types.ts:28-68`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/types.ts#L28)):
- `Npc`: `{ id, user_id, campaign_id, name, role: string|null, traits: string|null, created_at, updated_at }`
- `Relationship`: `{ id, user_id, campaign_id, from_npc_id, to_npc_id, type, description: string|null, created_at }`

**Relationship query pattern** — fetches all edges touching an NPC from either side ([`src/pages/campaigns/[id]/npcs/[npcId]/index.astro:36-40`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/campaigns/%5Bid%5D/npcs/%5BnpcId%5D/index.astro#L36)):
```typescript
.select("*").or(`from_npc_id.eq.${npcId},to_npc_id.eq.${npcId}`)
```

**Important**: Partner NPC names are not on the relationship row — must join with campaign NPC roster to resolve names from `from_npc_id`/`to_npc_id`. The campaign roster query is:
```typescript
.select("*").eq("campaign_id", campaignId).order("name")
```

**No service layer exists** — the S-04 API route must inline these queries directly (consistent with all other routes).

---

### G. Frontend React Patterns for Streaming UI — COMPATIBLE

**Embedding pattern** — interactive components are React islands in Astro pages with `client:load` ([`src/pages/campaigns/[id]/npcs/[npcId]/index.astro:92-98`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/campaigns/%5Bid%5D/npcs/%5BnpcId%5D/index.astro#L92)):
```astro
<RelationshipSection npcId={npcId} campaignId={id} ... client:load />
```
The S-04 `NpcReaction` component should follow this — embed on the NPC detail page with `client:load`.

**Async fetch pattern** — all async operations are event-driven (NOT `useEffect`). Pattern from [`src/components/campaigns/CampaignList.tsx:34`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/components/campaigns/CampaignList.tsx#L34):
```typescript
setIsLoading(true);
setError(null);
try {
  const res = await fetch(...);
  if (!res.ok) { setError(...); return; }
  // update state
} catch { setError("Network error..."); }
finally { setIsLoading(false); }
```

**For streaming**, adapt to:
```typescript
setIsStreaming(true);
setReactionText("");
setError(null);
try {
  const res = await fetch(`/api/npcs/${npcId}/reaction`, { method: "POST", body: ... });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // parse SSE lines, append text delta to reactionText
  }
} catch { setError("Network error..."); }
finally { setIsStreaming(false); }
```

**Spinner pattern** ([`src/components/auth/SubmitButton.tsx:19-22`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/components/auth/SubmitButton.tsx#L19)):
```tsx
<span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
```

**Error display**: Use the `ServerError` component pattern ([`src/components/auth/ServerError.tsx`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/components/auth/ServerError.tsx)).

**Only one shadcn component** in `src/components/ui/`: `button.tsx` — all other UI is custom Tailwind. The streaming response area will be a custom `<div>` with Tailwind prose styles.

---

## Code References

- [`src/lib/supabase.ts:3`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/lib/supabase.ts#L3) — `astro:env/server` import pattern (canonical env access)
- [`astro.config.mjs:17-22`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/astro.config.mjs#L17) — env schema; add `ANTHROPIC_API_KEY` here
- [`src/env.d.ts:1-5`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/env.d.ts#L1) — `Locals` type; no `runtime` property
- [`wrangler.jsonc:6`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/wrangler.jsonc#L6) — `nodejs_compat` flag
- [`src/pages/api/campaigns/index.ts:8-12`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/api/campaigns/index.ts#L8) — raw `new Response()` pattern
- [`src/pages/api/npcs/[id].ts`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/api/npcs/%5Bid%5D.ts) — closest existing route; S-04 reaction endpoint lives at `npcs/[id]/reaction.ts`
- [`src/pages/campaigns/[id]/npcs/[npcId]/index.astro:36-40`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/pages/campaigns/%5Bid%5D/npcs/%5BnpcId%5D/index.astro#L36) — relationship query pattern
- [`src/types.ts:28-68`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/types.ts#L28) — `Npc` and `Relationship` types
- [`src/components/campaigns/CampaignList.tsx:34`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/components/campaigns/CampaignList.tsx#L34) — async fetch + loading state pattern to follow
- [`src/components/auth/SubmitButton.tsx:11-33`](https://github.com/olekiwanski/npc-manager/blob/95e433229c9921f2bd1308fe6058c8c1f5fcc87d/src/components/auth/SubmitButton.tsx#L11) — spinner pattern

---

## Architecture Insights

1. **No service layer** — all Supabase queries are inlined directly in routes and pages. S-04 route will follow suit.
2. **Directed graph, both-direction query** — relationships must be fetched with `.or(from_npc_id.eq.X,to_npc_id.eq.X)` to capture both directions. Partner names need a secondary lookup against the campaign roster.
3. **`role` and `traits` are nullable** — the system prompt builder must handle nulls gracefully (omit or use placeholder text).
4. **Astro fetches data, React handles interactivity** — the NPC detail Astro page fetches NPC + relationships server-side; the React component receives them as props. For S-04, the scenario form + streaming display is a new React island on the same page, receiving `npcId` as a prop and making its own `POST /api/npcs/[id]/reaction` call client-side.
5. **SSE framing** — the SDK doc's `data: ${JSON.stringify({ text })}\n\n` format is correct; the React reader must parse each `data:` line and skip `[DONE]`.

---

## Required Changes to `anthropic-ai-sdk.md`

The doc has one incompatible code block that must be corrected before implementation:

**Line 81** — replace:
```typescript
const client = new Anthropic({ apiKey: locals.runtime.env.ANTHROPIC_API_KEY });
```
with:
```typescript
import { ANTHROPIC_API_KEY } from "astro:env/server";
// ...
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
```

**Lines 147-150** (env table) — add:
```
astro.config.mjs  | ANTHROPIC_API_KEY  | envField.string({ context: "server", access: "secret" })
```

Everything else in the doc (SSE format, ReadableStream, React reader, model list) is accurate and compatible.

---

## Open Questions

- None blocking — all data shapes, infrastructure, and patterns are confirmed. The two items above (install SDK, fix env access pattern) must be resolved in Phase 1 of implementation.
