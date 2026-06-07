# NPC AI Reaction (S-04) Implementation Plan

## Overview

Implement the north star feature: a GM types a natural-language scenario on the NPC detail page and receives a streamed, in-character AI response grounded in that NPC's profile, traits, and known relationships. Visible feedback appears within 2 seconds of submission.

## Current State Analysis

- `src/pages/campaigns/[id]/npcs/[npcId]/index.astro` — NPC detail page; already has a `RelationshipSection` React island (`client:load`). S-04 adds a second island below it.
- `src/pages/api/npcs/[id].ts` — existing PATCH/DELETE route; the new reaction endpoint lives at `src/pages/api/npcs/[id]/reaction.ts` (different path, no conflict).
- `src/lib/supabase.ts` — `createClient(headers, cookies)` pattern used by all existing routes.
- `src/types.ts:28-68` — `Npc` and `Relationship` types; `role` and `traits` are `string | null`.
- Relationship query: `.or(\`from_npc_id.eq.${npcId},to_npc_id.eq.${npcId}\`)` captures both edge directions.
- `astro.config.mjs:11,16` — `output: "server"`, Cloudflare adapter; `wrangler.jsonc:6` has `nodejs_compat`.
- `@anthropic-ai/sdk` is not yet installed; `ANTHROPIC_API_KEY` not in env schema.
- All env vars use `astro:env/server` imports — **not** `locals.runtime.env`.

## Desired End State

A GM on the NPC detail page sees a new "AI Reaction" section below relationships. They type a scenario (up to 500 chars), click "Ask", and within 2 seconds the first streamed text chunks appear in a response area. The response references the NPC's role, traits, and named relationships. If the stream fails mid-way, the partial text stays visible and an error message appears below it.

### Key Discoveries

- `role` and `traits` on `npcs` are both nullable — prompt builder must omit sections gracefully.
- Relationship partner names live on the `npcs` table, not on `npc_has_npc` — resolving names requires a second query for the campaign roster.
- Directed relationship edges use `from_npc_id` and `to_npc_id`; the "other" NPC is whichever id ≠ current NPC's id.
- React island embedding pattern: Astro page fetches data server-side, passes as props; React handles all interactivity (`client:load`). NpcReaction needs only `npcId` as a prop — it fetches its data client-side via the API route.
- Only one shadcn component exists (`button.tsx`); all other UI is custom Tailwind.
- `ServerError` lives at `src/components/auth/ServerError.tsx` — reuse for error display.
- Zod is used for request body validation in all existing API routes.

## What We're NOT Doing

- No new database tables or migrations.
- No rate limiting or per-user request throttling.
- No conversation history — single-turn only (scenario in, reaction out).
- No markdown rendering of the AI response — plain whitespace-preserved text.
- No caching of reactions.
- No model selector UI — `claude-sonnet-4-6` is hardcoded.
- No streaming token counter or progress bar beyond the existing spinner.
- No saving reactions to the database.

## Implementation Approach

Five sequential phases, each independently verifiable. Phases 1–2 set up prerequisites with no user-visible change; Phase 3 completes the backend; Phases 4–5 wire up the UI. The system prompt builder is extracted into a pure function (`src/lib/npc-reaction.ts`) so it can be unit tested in isolation before the route depends on it.

## Critical Implementation Details

**Route file coexistence**: `src/pages/api/npcs/[id].ts` (a file) and `src/pages/api/npcs/[id]/reaction.ts` (inside a directory) differ at the filesystem level — one is a `.ts` file, the other is a directory entry. Astro's file router handles these as distinct routes with no conflict.

**Mid-stream error forwarding**: The `ReadableStream.start()` callback wraps the `for await` loop in a `try/catch`. On Anthropic SDK error (network, rate limit, upstream 5xx), it enqueues a `data: {"error":"..."}` SSE frame and then closes the controller. The React client parses this frame, sets error state, and stops reading — partial text already in `reactionText` state is preserved.

---

## Phase 1: Prerequisites & Env Config

### Overview

Install the Anthropic SDK and register `ANTHROPIC_API_KEY` in Astro's env schema so all subsequent phases can import it. No user-visible change.

### Changes Required

#### 1. Install `@anthropic-ai/sdk` and `zod`

**File**: `package.json` (via shell)

**Intent**: Add the Anthropic TypeScript SDK and Zod validation library as runtime dependencies. Zod is mandated by AGENTS.md for all API route request validation and is not yet in `package.json`.

**Contract**: Run `npm install @anthropic-ai/sdk zod`. Verify both appear under `dependencies` in `package.json`.

#### 2. Add `ANTHROPIC_API_KEY` to env schema

**File**: `astro.config.mjs`

**Intent**: Register the secret so `astro:env/server` exposes it at runtime, matching the project convention for all server-side secrets.

**Contract**: Inside the `env.schema` object alongside `SUPABASE_URL` and `SUPABASE_KEY`, add:
```
ANTHROPIC_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
```
Use `optional: true` to match the project convention — without it, the CI build fails on every PR (CI runs `lint + build` without this secret). In the API route, access via `ANTHROPIC_API_KEY!` (non-null assertion) consistent with how Supabase vars are used, or guard explicitly with a 503 if undefined.

#### 3. Update `.env.example`

**File**: `.env.example`

**Intent**: Document the new required variable so future contributors know to set it.

**Contract**: Add `ANTHROPIC_API_KEY=###` below the existing Supabase entries.

### Success Criteria

#### Automated Verification

- `npm run build` passes with no type errors related to `ANTHROPIC_API_KEY`
- `npm run lint` passes

#### Manual Verification

- Local dev server (`npm run dev`) starts without errors after adding `ANTHROPIC_API_KEY=<real-key>` to `.dev.vars`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: System Prompt Builder + Unit Tests

### Overview

Extract the NPC-to-system-prompt logic into a pure function that can be unit tested before the API route depends on it. This is the highest-value logic in S-04 and the one most likely to misbehave silently on nullable fields.

### Changes Required

#### 1. Create `src/lib/npc-reaction.ts`

**File**: `src/lib/npc-reaction.ts`

**Intent**: Export a pure function `buildNpcSystemPrompt` that assembles a Claude system prompt from an NPC's profile and its resolved relationship context. Must handle all nullable fields without crashing or producing malformed output.

**Contract**:

```typescript
export function buildNpcSystemPrompt(
  npc: Npc,
  relationships: Relationship[],
  roster: Npc[]
): string
```

Prompt structure (each section is conditionally included):

1. **Identity line** (always): `You are {name}` + `, a {role}` if `role` is not null.
2. **Traits paragraph** (only if `traits` is not null): `\nPersonality and traits: {traits}`
3. **Relationships block** (only if `relationships.length > 0`): `\nYour known relationships:` followed by one line per relationship:
   - Resolve the partner's id: `rel.from_npc_id !== npc.id ? rel.from_npc_id : rel.to_npc_id`
   - Resolve the partner's name from `roster`; use `"an unknown NPC"` as fallback if not found
   - Line format: `- {partnerName} ({rel.type})` + `: {rel.description}` if description is not null
4. **Closing instruction** (always): `\nStay in character as {name}. Respond to the scenario as this character would, referencing your background and relationships where relevant.`

#### 2. Create `src/lib/npc-reaction.test.ts`

**File**: `src/lib/npc-reaction.test.ts`

**Intent**: Unit test all nullable-field branches and relationship resolution paths so regressions surface in CI before they reach the AI layer.

**Contract**: Vitest test file co-located with source. Cover:
- NPC with all fields populated → prompt includes identity, traits, and relationships block
- NPC with `role: null` → identity line has no role segment
- NPC with `traits: null` → no traits paragraph
- NPC with empty `relationships` array → no relationships block
- Relationship with `description: null` → line shows only `(type)`, no colon segment
- Partner NPC id present in roster → correct name used
- Partner NPC id absent from roster → `"an unknown NPC"` fallback used
- Relationship where current NPC is `to_npc_id` (incoming edge) → partner resolved from `from_npc_id`

### Success Criteria

#### Automated Verification

- `npm run test` passes with all 8 unit test cases green
- TypeScript: no errors in `src/lib/npc-reaction.ts`

#### Manual Verification

- Inspect one generated prompt for a real NPC (via `console.log` in a test run) to confirm the prose reads naturally

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: API Route

### Overview

New SSE endpoint `POST /api/npcs/:id/reaction` that authenticates the request, fetches NPC context, builds the system prompt, calls Claude with streaming, and forwards text deltas as SSE frames. Errors before streaming begin return JSON; errors during streaming are forwarded as SSE error frames.

### Changes Required

#### 1. Create `src/pages/api/npcs/[id]/reaction.ts`

**File**: `src/pages/api/npcs/[id]/reaction.ts`

**Intent**: Implement the streaming reaction endpoint following the project's API route conventions (prerender false, uppercase export, Zod validation, auth via `locals.user`, raw `new Response()`).

**Contract**: `export const prerender = false` + `export const POST: APIRoute`. Request body schema: `{ scenario: string }` validated with Zod (`.min(1).max(500)`). Auth guard: check `locals.user`; return 401 if absent. NPC ownership: query `npcs` with both `.eq("id", npcId)` and `.eq("user_id", user.id)`; return 404 if not found. Fetch relationships via `.or(...)` and campaign roster via `.eq("campaign_id", npc.campaign_id)`. Build system prompt via `buildNpcSystemPrompt`. Pass prompt to `client.messages.stream()` with `model: "claude-sonnet-4-6"` and `max_tokens: 1024`. Wrap the `for await` loop in a `try/catch` inside `ReadableStream.start()` — on error, enqueue `data: {"error":"Stream interrupted"}` then close. Return `new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } })`.

### Success Criteria

#### Automated Verification

- TypeScript: no errors in the route file
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- **Routing smoke test first** (this is the first nested dynamic route in the codebase): create the file with just a stub `POST` returning `200 OK`, hit it with `curl -X POST http://localhost:4321/api/npcs/any-id/reaction` before building full logic — confirm routing resolves correctly
- `POST /api/npcs/{valid-id}/reaction` with `{ "scenario": "..." }` → returns 200 with `Content-Type: text/event-stream` and SSE data frames visible in DevTools Network tab
- Request without auth cookie → returns 401 JSON
- Request with `scenario: ""` or `scenario` longer than 500 chars → returns 400 JSON
- Request with a NPC id belonging to another user → returns 404 JSON

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 4.

---

## Phase 4: React Streaming Component

### Overview

New React island `NpcReaction` with a scenario textarea, submit button, and a streaming text display area. Follows the project's event-driven fetch pattern (no `useEffect` for data fetching), the existing spinner style, and `ServerError` for error display.

### Changes Required

#### 1. Create `src/components/npcs/NpcReaction.tsx`

**File**: `src/components/npcs/NpcReaction.tsx`

**Intent**: Render a scenario form and display the streamed AI response incrementally as text deltas arrive. Keep partial text visible on stream failure and show an error message below it.

**Contract**: Props: `{ npcId: string }`. State: `scenario` (controlled input), `reactionText` (appended with each `text` SSE frame), `isStreaming` (boolean), `error` (string | null). Ref: `abortRef` (`useRef<AbortController | null>(null)`) — created fresh on each submit, stored in the ref. Add `useEffect(() => () => abortRef.current?.abort(), [])` for cleanup on unmount (this is the one legitimate `useEffect` in this component — not for data fetching, but for cleanup, consistent with click-outside patterns in `CampaignCard`, `NpcCard`, `RelationshipRow`). Pass `{ signal: abortRef.current.signal }` to `fetch`. Submit handler is a plain `onSubmit` (not React 19 form action — use `e.preventDefault()` + `async function`) because `useFormStatus` does not integrate with streaming responses. While `isStreaming`, disable both the textarea and the button. Button shows the project spinner (`size-4 animate-spin rounded-full border-2 border-white/30 border-t-white`) with text "Generating…" when streaming, "Ask" otherwise. The SSE reader loop: `fetch` → check `res.ok` (non-ok → read JSON error, set error state, return) → `res.body.getReader()` → `while(true)` read chunks → decode → split on `"\n"` → parse `data:` lines → append `parsed.text` to `reactionText` via state setter; on `parsed.error` set error state and break; skip `[DONE]`. On catch, set error "Network error. Please try again." Always set `isStreaming(false)` in `finally`. **Note (MVP tradeoff)**: uses simple `chunk.split('\n')` SSE parsing with no line buffer — works reliably for Cloudflare Workers' typical frame-complete flush behavior; upgrade to a buffered parser if field testing reveals dropped chunks. Render the `reactionText` in a `div` with `whitespace-pre-wrap` — only shown when `reactionText` is non-empty. Render `<ServerError message={error} />` below the response area. Textarea `maxLength={500}` with a character counter `{scenario.length}/500`.

### Success Criteria

#### Automated Verification

- TypeScript: no errors in `NpcReaction.tsx`
- `npm run lint` passes

#### Manual Verification

- Submitting a valid scenario shows the spinner immediately (visually < 1s)
- Response text appears incrementally as the stream arrives (typewriter effect)
- Submitting an empty or whitespace-only scenario: the button remains disabled
- While streaming: textarea and button are both disabled
- After stream completes: button re-enables, textarea re-enables
- Simulated mid-stream failure (devtools → throttle network to offline after first chunks): partial text stays, error message appears below it
- Character counter increments correctly; textarea cannot exceed 500 chars

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 5.

---

## Phase 5: Page Integration

### Overview

Embed the `NpcReaction` island in the NPC detail page as a new section below `RelationshipSection`. Astro passes `npcId` as a prop; the component handles everything else client-side.

### Changes Required

#### 1. Update `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`

**Intent**: Add the AI Reaction section to the NPC detail page, following the same island embedding pattern as `RelationshipSection`.

**Contract**: Import `NpcReaction` from `@/components/npcs/NpcReaction`. After the `RelationshipSection` section block (around line 98), add a new `<section>` with the same visual style (`rounded-2xl border border-white/10 bg-white/10 p-8 text-white backdrop-blur-xl`) containing a heading "AI Reaction" and `<NpcReaction npcId={npcId} client:load />`.

### Success Criteria

#### Automated Verification

- `npm run build` passes with no type errors
- `npm run lint` passes

#### Manual Verification

- NPC detail page renders the new "AI Reaction" section below relationships
- Full happy path: type a scenario → submit → spinner appears in < 2s → streamed response appears referencing the NPC's name, role/traits, and at least one relationship (for an NPC that has relationships)
- Page renders correctly for an NPC with no traits and no relationships (empty fields handled gracefully — no crash, no empty labels)
- No regression on existing NPC detail functionality (relationships still work)

**Implementation Note**: After completing this phase and all automated verification passes, this is the final confirmation — S-04 is done.

---

## Testing Strategy

### Unit Tests

- `src/lib/npc-reaction.test.ts` — 8 cases covering all nullable-field branches and relationship direction/resolution paths (see Phase 2)

### Integration Tests

- None automated — the streaming endpoint and React component are covered by manual verification in Phases 3–5.

### Manual Testing Steps

1. Add `ANTHROPIC_API_KEY=<real-key>` to `.dev.vars` and start `npm run dev`
2. Sign in and navigate to an NPC that has: name, role, traits, and at least 2 relationships
3. Submit a scenario that relates to a known relationship (e.g., "The party asks Gareth about his old friend Marcus")
4. Confirm: spinner appears immediately, text streams in, response references Marcus or the relationship type
5. Test with an NPC that has `null` role and `null` traits — confirm no crash, response is still in-character
6. Test with an NPC with no relationships — confirm relationships section is absent from the response context without errors
7. Throttle DevTools network to "Slow 3G", submit — confirm spinner appears within 2s even on slow connection
8. Disconnect network mid-stream — confirm partial text preserved, error message visible

## Performance Considerations

- Two extra Supabase queries per request (relationships + campaign roster). Both are single-table SELECTs with indexed foreign keys — negligible latency.
- `max_tokens: 1024` caps Claude's output at a reasonable length. Adjust if responses feel truncated.
- The `NodeJS.compat` flag is already set — no additional Cloudflare config needed for streaming.

## References

- Research: `context/changes/npc-ai-reaction/research.md`
- SDK reference: `context/changes/npc-ai-reaction/anthropic-ai-sdk.md`
- Existing React island pattern: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:92-98`
- Closest existing API route: `src/pages/api/npcs/[id].ts`
- Supabase client factory: `src/lib/supabase.ts`
- Existing types: `src/types.ts:28-68`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Prerequisites & Env Config

#### Automated

- [x] 1.1 `npm run build` passes with no type errors related to `ANTHROPIC_API_KEY` — 96f722c
- [x] 1.2 `npm run lint` passes — 96f722c

#### Manual

- [x] 1.3 Local dev server starts without errors after adding `ANTHROPIC_API_KEY` to `.dev.vars`

### Phase 2: System Prompt Builder + Unit Tests

#### Automated

- [x] 2.1 `npm run test` passes with all 8 unit test cases green — acfb7e9
- [x] 2.2 TypeScript: no errors in `src/lib/npc-reaction.ts` — acfb7e9

#### Manual

- [x] 2.3 Inspect one generated prompt for a real NPC to confirm prose reads naturally — acfb7e9

### Phase 3: API Route

#### Automated

- [x] 3.1 TypeScript: no errors in the route file
- [x] 3.2 `npm run lint` passes
- [x] 3.3 `npm run build` passes

#### Manual

- [x] 3.4 `POST /api/npcs/{valid-id}/reaction` returns 200 with `text/event-stream` and SSE frames visible in DevTools
- [x] 3.5 Request without auth cookie → 401 JSON
- [x] 3.6 Request with empty or >500-char scenario → 400 JSON
- [x] 3.7 Request with another user's NPC id → 404 JSON

### Phase 4: React Streaming Component

#### Automated

- [ ] 4.1 TypeScript: no errors in `NpcReaction.tsx`
- [ ] 4.2 `npm run lint` passes

#### Manual

- [ ] 4.3 Spinner appears immediately on submit (< 1s visual feedback)
- [ ] 4.4 Response text appears incrementally (typewriter effect)
- [ ] 4.5 Empty/whitespace scenario keeps button disabled
- [ ] 4.6 Mid-stream failure: partial text stays, error message appears

### Phase 5: Page Integration

#### Automated

- [ ] 5.1 `npm run build` passes with no type errors
- [ ] 5.2 `npm run lint` passes

#### Manual

- [ ] 5.3 NPC detail page shows the "AI Reaction" section below relationships
- [ ] 5.4 Full happy path: scenario → streamed in-character response referencing NPC traits and a named relationship
- [ ] 5.5 NPC with null traits and no relationships renders without crash
- [ ] 5.6 No regression in existing RelationshipSection functionality
