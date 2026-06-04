# NPC AI Reaction Implementation Plan

## Overview

Build S-04 — the roadmap north star. A GM opens an NPC detail page, types a natural-language scenario ("How would Thorin react to a betrayal?"), and receives a **streamed** in-character AI response within 2 seconds. The response is grounded in the NPC's role, traits, and all known relationships. No state is mutated — re-query is always available, and each new submission replaces the previous response.

Both AI backends are implemented: `AnthropicClient` (prod, via `ANTHROPIC_API_KEY`) and `OllamaClient` (dev-only, via `OLLAMA_BASE_URL`). When neither key is configured the section renders as disabled with a config prompt.

## Current State Analysis

- Data is fully ready: `npcs` (name/role/traits) and `npc_has_npc` (directed relationships with type + description) exist with RLS. The `S-03` fetch pattern (`.or(from_npc_id.eq.X, to_npc_id.eq.X)`) is the template for context assembly.
- No AI SDK is installed — `package.json` has no `@anthropic-ai/sdk`, `openai`, or similar. `zod` is transitive only; it needs to be made explicit.
- Streaming is the single net-new element: no `ReadableStream`, SSE, or `getReader()` anywhere in `src/` today — both server and client ends are greenfield.
- The `astro:env` schema (`astro.config.mjs:17-22`) and the `configStatuses` array (`src/lib/config-status.ts`) are the two integration points for new env vars.
- The NPC detail page (`src/pages/campaigns/[id]/npcs/[npcId]/index.astro`) mounts React islands with `client:load`; a third section card goes after the relationships section (after line 90).

### Key Discoveries

- `src/lib/supabase.ts:5-24` — factory template: named export, reads `astro:env/server`, returns `null` when unconfigured. The AI client factory must mirror this exactly.
- `src/pages/api/npcs/index.ts:8-70` — canonical route shape: `prerender = false`, local `json()` helper, zod `safeParse`, auth + RLS ownership re-check, `{ data }` / `{ error }` response.
- `vitest.config.ts:11` — `src/lib/supabase.ts` and `src/lib/config-status.ts` are excluded from coverage because they import `astro:env`. All new `src/lib/ai/*.ts` files that import `astro:env` or make external network calls must be added to the same exclusion list.
- `eslint.config.js:72` — `@typescript-eslint/no-misused-promises` is already disabled for `**/*.astro`; no change needed when the detail page gains env-var imports.
- Anthropic streams SSE (`event: content_block_delta` / `delta.text`); Ollama streams NDJSON (`message.content`, `done: true`). Both must be normalized to the same client-facing format via `TransformStream`.

## Desired End State

A GM viewing any NPC detail page sees a third section card — "Ask AI" — below the relationships card. They type a scenario, submit, and a spinner appears immediately. Within 2 seconds the streamed in-character response begins rendering. On re-submit the previous response is replaced. If the AI backend is absent the section renders disabled with a link-free config hint. If the stream errors mid-way the partial response is preserved and an inline error message appears below it.

### Key Discoveries (continued):

- Context assembly: fetch NPC → fetch relationships → fetch partner names via `.in("id", partnerIds)` (not the full roster) → `buildSystemPrompt()`.
- System prompt carries NPC identity + relationship list; scenario text is the user message. This enables Anthropic prompt caching on the system prompt.
- Normalized wire format: `data: {"text":"…","done":false}\n\n` and `data: {"done":true}\n\n` — both backends produce this via `TransformStream`. The React island parses this single format.

## What We're NOT Doing

- No response persistence — reactions are ephemeral per session; no new DB table.
- No conversation history / multi-turn — each submission is a single-turn query.
- No relationship cap — all NPC relationships are included in context (PRD US-01 AC: relationships enrich, not gate).
- No shadcn textarea component — the textarea stays inline with `cn()`, matching the existing `NpcForm` pattern.
- No EventSource / SSE browser API — POST endpoint requires `fetch` + `getReader()`.
- No Ollama model configuration UI — hardcode `llama3`; Anthropic uses `claude-haiku-4-5-20251001`.

## Implementation Approach

Four phases, each independently verifiable:

1. Lay the AI client foundation (env, factory, both backends, config-status).
2. Build and test the pure prompt-builder function.
3. Wire the streaming API endpoint.
4. Build the React island and integrate it into the NPC detail page.

## Critical Implementation Details

**SSE frame buffering — applies to Phase 1 (server) and Phase 4 (client)**: `reader.read()` returns arbitrary byte chunks that do not align to SSE frame boundaries. Both the `TransformStream` implementations in the AI clients and the island's stream-reader loop must buffer, split on `"\n\n"`, keep the trailing incomplete fragment, and only parse complete messages. The naive pattern of decoding each chunk directly will silently drop or mis-parse frames on slow connections.

**Async streaming in Workers**: use a `TransformStream`, return its `.readable` side immediately as the `Response` body, and drive the pipe in a self-contained async IIFE. Workers CPU time is charged only for active JS execution — idle `await reader.read()` waits are free. Do not `await` the whole pipe before returning the response.

**Do not set `Content-Length`**: set `Cache-Control: no-cache` on streaming responses but never `Content-Length`. Workers applies chunked transfer encoding automatically.

---

## Phase 1: AI Client Foundation

### Overview

Register the two new env vars in the `astro:env` schema, install zod as an explicit dependency, implement the `AiClientInterface` + both clients + factory, plug the AI config check into the existing banner system, and update dev-environment files.

### Changes Required

#### 1. Environment schema

**File**: `astro.config.mjs`

**Intent**: Register `ANTHROPIC_API_KEY` and `OLLAMA_BASE_URL` so they're available via `astro:env/server` and auto-typed without touching `src/env.d.ts`.

**Contract**: Add two entries inside the `env.schema` block, after the existing Supabase fields:
```js
ANTHROPIC_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
OLLAMA_BASE_URL:   envField.string({ context: "server", access: "public", optional: true }),
```
Neither has a `default` — the graceful-null factory depends on both being `undefined` when unset.

---

#### 2. Explicit zod dependency

**File**: `package.json`

**Intent**: `zod` is currently transitive. Phase 3 imports it directly in the API route, making it an explicit dependency.

**Contract**: Run `npm install zod`. Adds `"zod": "^x.y.z"` to `dependencies`.

---

#### 3. AI client interface

**File**: `src/lib/ai/interface.ts` *(new)*

**Intent**: Define the shared contract that both AI clients implement and the normalized SSE chunk type consumed by the React island.

**Contract**: Export `AiClientInterface` with a single method `react(systemPrompt: string, scenario: string): Promise<Response>`. The returned `Response` has `Content-Type: text/event-stream` and streams frames in this format:
- text chunk: `data: {"text":"…","done":false}\n\n`
- completion: `data: {"done":true}\n\n`
- error: `data: {"error":"…","done":true}\n\n`

**The method always returns HTTP 200**, even when the upstream AI fails before streaming begins. Errors are delivered in-band as SSE error frames — never as a non-2xx HTTP status. This invariant is required by the island, which branches on `!res.ok` to distinguish a pre-auth/routing failure (JSON body) from any AI-layer outcome (SSE body).

Also export `StreamChunk` as `{ text: string; done: boolean } | { error: string; done: true }` for use in the island.

---

#### 4. Anthropic client

**File**: `src/lib/ai/anthropic.ts` *(new)*

**Intent**: Implement `AiClientInterface` by calling the Anthropic Messages API via raw `fetch` and transforming the upstream SSE stream to the normalized format.

**Contract**: `AnthropicClient` takes `apiKey: string` in the constructor. `react()` calls `POST https://api.anthropic.com/v1/messages` with `stream: true`, model `claude-haiku-4-5-20251001`, `max_tokens: 1024`, the `systemPrompt` as the `system` field, and `scenario` as a single `user` message. Returns a `Response` whose body is the output of a `TransformStream` that:
1. Buffers incoming bytes with a `\n\n` split (see Critical Implementation Details).
2. On `event: content_block_delta` with `delta.type === "text_delta"`: emits `data: {"text":"…","done":false}\n\n`.
3. On `event: message_stop`: emits `data: {"done":true}\n\n` and closes the writer.
4. On any exception: emits `data: {"error":"…","done":true}\n\n` and closes.

If `upstream.ok` is false before streaming begins, return a one-shot error frame response without starting the transform.

---

#### 5. Ollama client

**File**: `src/lib/ai/ollama.ts` *(new)*

**Intent**: Implement `AiClientInterface` by calling the Ollama `/api/chat` endpoint and transforming NDJSON chunks to the normalized SSE format. Dev-only — localhost unreachable from deployed Workers.

**Contract**: `OllamaClient` takes `baseUrl: string`. `react()` calls `POST {baseUrl}/api/chat` with `stream: true`, model `llama3`, and `messages: [{role:"system",…},{role:"user",…}]`. Returns a `Response` using the same `TransformStream` pattern as `AnthropicClient`, splitting on `"\n"` (NDJSON lines), parsing each line as JSON, and emitting:
- On `done === false` and `message.content` present: text chunk frame.
- On `done === true`: completion frame; close the writer.
- On exception: error frame; close.

---

#### 6. AI client factory

**File**: `src/lib/ai/index.ts` *(new)*

**Intent**: Read env vars at request time and return the highest-priority configured client, or `null` when neither key is present.

**Contract**: `export function createAiClient(): AiClientInterface | null`. Imports `ANTHROPIC_API_KEY` and `OLLAMA_BASE_URL` from `astro:env/server`. Priority: if `ANTHROPIC_API_KEY` is set → `new AnthropicClient(ANTHROPIC_API_KEY)`; else if `OLLAMA_BASE_URL` is set → `new OllamaClient(OLLAMA_BASE_URL)`; else `null`. Callers that receive `null` return 503.

---

#### 7. Config-status integration

**File**: `src/lib/config-status.ts`

**Intent**: Add an AI entry so `Layout.astro` automatically surfaces a banner when neither key is configured — zero UI changes required.

**Contract**: Import `ANTHROPIC_API_KEY` and `OLLAMA_BASE_URL` from `astro:env/server`. Append to `configStatuses`:
```ts
{
  name: "AI",
  configured: Boolean(ANTHROPIC_API_KEY || OLLAMA_BASE_URL),
  message: "AI nie jest skonfigurowane — dodaj ANTHROPIC_API_KEY lub OLLAMA_BASE_URL, aby włączyć reakcje NPC.",
}
```

---

#### 8. Dev environment files

**Files**: `.env.example`, `.dev.vars`

**Intent**: Document the two new keys for local developers.

**Contract**: Append two commented lines to both files:
```
# ANTHROPIC_API_KEY=sk-ant-...
# OLLAMA_BASE_URL=http://127.0.0.1:11434
```

---

#### 9. Vitest coverage exclusions

**File**: `vitest.config.ts`

**Intent**: Exclude the three AI client files that import `astro:env` or make external network calls from coverage, following the same convention as `supabase.ts` and `config-status.ts`.

**Contract**: Add `"src/lib/ai/index.ts"`, `"src/lib/ai/anthropic.ts"`, and `"src/lib/ai/ollama.ts"` to the `coverage.exclude` array. `src/lib/ai/interface.ts` and `src/lib/ai/prompt.ts` remain in coverage.

---

### Success Criteria

#### Automated Verification

- `npm run build` succeeds with the two new env vars declared but absent (all `optional: true`)
- `npm run lint` passes — no new type errors from the AI module files
- `npm run test` passes (no tests yet for Phase 1, but existing tests must not regress)

#### Manual Verification

- With no env vars set: `createAiClient()` returns `null`; Layout.astro shows the "AI nie jest skonfigurowane" banner
- With `ANTHROPIC_API_KEY=test` in `.dev.vars`: `createAiClient()` returns an `AnthropicClient` instance; banner is absent
- With `OLLAMA_BASE_URL=http://localhost:11434` in `.dev.vars` and no `ANTHROPIC_API_KEY`: returns `OllamaClient` (ensure `ollama pull llama3` has been run locally first, or update the model constant in `ollama.ts` to match an available model)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Prompt Builder + Unit Tests

### Overview

Build the pure function that assembles the system prompt from an NPC's profile and resolved relationships. Unit-test all edge cases (no traits, no role, no relationships, relationship with no description).

### Changes Required

#### 1. Prompt builder function

**File**: `src/lib/ai/prompt.ts` *(new)*

**Intent**: Pure function — takes a fully resolved NPC + relationship list and returns the system-prompt string ready to pass to any AI client.

**Contract**:

```ts
interface PromptRelationship {
  partnerName: string;
  type: string;
  description: string | null;
}
export function buildSystemPrompt(npc: Npc, relationships: PromptRelationship[]): string
```

Output template (render each section only when data is present; fall back to "No known [x]." otherwise):

```
You are playing [name], [role | "a character without a defined role"].

[name]'s traits:
[traits | "No known traits."]

[name]'s known relationships:
- [partnerName] ([type]): [description | "No description."]
…
(or "No known relationships." when the array is empty)

Stay fully in character as [name]. Respond to the scenario in [name]'s voice, drawing on their traits and relationships. Do not break character.
```

---

#### 2. Unit tests

**File**: `src/lib/ai/prompt.test.ts` *(new)*

**Intent**: Test `buildSystemPrompt` across all NPC profile and relationship edge cases.

**Contract**: Cover at minimum:
- Full profile (name, role, traits) + two relationships (one with description, one without)
- NPC with `role: null`
- NPC with `traits: null`
- Empty relationships array
- Relationships present but all with `description: null`

---

### Success Criteria

#### Automated Verification

- `npm run test` passes — all `prompt.test.ts` cases green
- `npm run lint` passes

#### Manual Verification

- Inspect the generated system prompt for a representative NPC with traits and relationships — confirm it reads naturally and includes all context sections

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Streaming API Endpoint

### Overview

Add `POST /api/npcs/[id]/reaction` following the established route convention. The endpoint validates the scenario, assembles NPC context, builds the system prompt, and forwards a streaming AI response.

### Changes Required

#### 1. Reaction endpoint

**File**: `src/pages/api/npcs/[id]/reaction.ts` *(new)*

**Intent**: Validate the scenario, confirm NPC ownership, assemble context, and stream the AI response — no mutations, auth and RLS defense in depth.

**Contract**:

- `export const prerender = false`
- Local `json()` helper (same shape as other routes)
- `reactionQuerySchema = z.object({ scenario: z.string().min(1, "Scenario is required").max(2000, "Scenario must be 2000 characters or fewer") })`
- Auth guard: `createClient(headers, cookies)` + `locals.user` → 401 if either null
- NPC ownership re-check: `.from("npcs").select("*").eq("id", params.id).maybeSingle()` (RLS-scoped) → 404 if no row
- Body parse: `try/catch request.json()` → 400 on invalid JSON; `reactionQuerySchema.safeParse()` → 400 on validation failure
- Context assembly (errors degrade gracefully — relationships enrich, not gate):
  1. Fetch relationships: `.from("npc_has_npc").select("*").or(from_npc_id.eq.{npcId},to_npc_id.eq.{npcId})`. If `relResult.error`, log `console.warn` and treat as empty array (proceed to step 4 with no relationships).
  2. Collect unique partner IDs (from both endpoints). If `partnerIds.length > 0`: `.from("npcs").select("id, name").in("id", partnerIds)`; else use empty array. If the partner-name fetch errors, log `console.warn` and treat as empty array (partner names will be omitted from the prompt).
  3. Build `PromptRelationship[]` by resolving `partnerName` from the fetched roster.
  4. Call `buildSystemPrompt(npc, promptRelationships)`
- AI client: `createAiClient()` → `null` → `json(503, { error: "AI not configured" })`
- Return: `return aiClient.react(systemPrompt, scenario.data.scenario)` — the streaming `Response` is returned directly; do not buffer or transform it further.

The endpoint does not set `Content-Type` or `Cache-Control` itself — those come from `aiClient.react()`.

---

### Success Criteria

#### Automated Verification

- `npm run lint` passes on the new file
- `npm run build` succeeds

#### Manual Verification

- `POST /api/npcs/[id]/reaction` with a valid scenario and valid NPC id → SSE stream of normalized frames arrives; last frame has `done: true`
- Missing/expired session → 401
- Invalid or foreign NPC id → 404
- `createAiClient()` returns null (keys absent) → 503 JSON error
- `scenario` empty or over 2000 chars → 400 JSON error
- Partial stream (kill connection mid-way server-side) → client receives partial text + error frame or clean close
- Confirm `PATCH /api/npcs/:id` and `DELETE /api/npcs/:id` from the existing `[id].ts` still respond correctly — no routing regression from the `[id].ts` + `[id]/` file+directory coexistence

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 4.

---

## Phase 4: React Island + Page Integration

### Overview

Build `ReactionSection.tsx` — the streaming-aware React island — and mount it on the NPC detail page. Handle the disabled state (no AI config), in-progress streaming (spinner + accumulating text), errors (partial response preserved + inline error), and re-query (replace on submit).

### Changes Required

#### 1. ReactionSection island

**File**: `src/components/npcs/ReactionSection.tsx` *(new)*

**Intent**: Self-contained React island for the "Ask AI" scenario form. Accepts an `aiEnabled` flag so the page can disable the feature without conditional rendering.

**Contract**:

Props:
```ts
interface ReactionSectionProps {
  npcId: string;
  campaignId: string;
  aiEnabled: boolean;
}
```

State: `scenario: string`, `streaming: boolean`, `response: string`, `error: string | null`.

When `aiEnabled === false`: render the section content but the textarea and button are `disabled`; show a short inline message ("AI nie jest skonfigurowane").

When `aiEnabled === true`, `handleSubmit`:
1. Set `streaming=true`, `response=""`, `error=null`.
2. `fetch(\`/api/npcs/${npcId}/reaction\`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ scenario }) })`.
3. If `!res.ok`: read `{ error }` from JSON body, set `error`, `streaming=false`, return.
4. Stream read loop — **must buffer for SSE frame boundaries**:

```ts
let buffer = "";
const reader = res.body!.getReader();
const decoder = new TextDecoder();
outer: for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const messages = buffer.split("\n\n");
  buffer = messages.pop() ?? "";
  for (const msg of messages) {
    const dataLine = msg.split("\n").find(l => l.startsWith("data: "));
    if (!dataLine) continue;
    const payload = JSON.parse(dataLine.slice(6)) as StreamChunk;
    if ("error" in payload) { setError(payload.error); break outer; }
    if (payload.done)        { break outer; }
    setResponse(prev => prev + payload.text);
  }
}
setStreaming(false);
```

5. Catch block: set `error` from the caught Error, `streaming=false`.

Response area: `<pre>` with `whitespace-pre-wrap` and the frosted-glass text color. Submit button: inline spinner using the same `size-4 animate-spin rounded-full border-2 border-white/30 border-t-white` pattern from `SubmitButton.tsx`.

Textarea: inline `<textarea className={cn(...)}>`, no shadcn component. Placeholder: "How would [NPC name] react to…". Disabled during `streaming`.

Error display: red inline text below the response area (always shown when `error` is non-null, even when `response` is also non-empty).

---

#### 2. NPC detail page wiring

**File**: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`

**Intent**: Derive `aiEnabled` from the server-side env check and mount the `ReactionSection` island as a third section card.

**Contract**:
- Add `import { ANTHROPIC_API_KEY, OLLAMA_BASE_URL } from "astro:env/server"` to the frontmatter imports.
- Derive `const aiEnabled = Boolean(ANTHROPIC_API_KEY || OLLAMA_BASE_URL)` in frontmatter.
- Import `ReactionSection` from `@/components/npcs/ReactionSection`.
- After the closing `</section>` of the relationships card (line 90), add:
```astro
<section class="mt-6 rounded-2xl border border-white/10 bg-white/10 p-8 text-white backdrop-blur-xl">
  <h2 class="mb-4 text-sm font-semibold tracking-wide text-blue-100/60 uppercase">Ask AI</h2>
  <ReactionSection npcId={npcId} campaignId={id} aiEnabled={aiEnabled} client:load />
</section>
```

---

### Success Criteria

#### Automated Verification

- `npm run lint` passes (no React Compiler rule violations, no unused vars)
- `npm run build` succeeds

#### Manual Verification

- Navigate to any NPC detail page → "Ask AI" section is visible below Relationships
- With AI configured: type a scenario → spinner appears immediately (< 2 s) → text streams in character → spinner disappears on completion
- Re-submit a second scenario → previous response replaced, new stream starts
- Mid-stream error (e.g. kill Ollama mid-response): partial text visible + red error message below it
- With no AI keys configured: textarea and button are disabled; config hint is visible; Layout banner also shown
- No regressions on the NPC edit, campaign, or relationship flows

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the full end-to-end feature is working before considering this change done.

---

## Testing Strategy

### Unit Tests

- `src/lib/ai/prompt.test.ts` — `buildSystemPrompt` with full profile, null role, null traits, empty relationships, relationships with no description.

### Integration Tests

None — the AI reaction is end-to-end verified manually (streaming endpoint + live AI backend).

### Manual Testing Steps

1. Start dev server with `OLLAMA_BASE_URL=http://127.0.0.1:11434` (and Ollama running) or `ANTHROPIC_API_KEY=sk-ant-…`
2. Sign in → open any campaign → open an NPC with traits and at least one relationship
3. Submit a scenario → verify spinner appears < 2s → verify streamed in-character text
4. Submit a second scenario → verify first response is replaced
5. Simulate error: set an invalid API key → submit → verify error message appears (with no partial response, since the failure is pre-stream)
6. Kill AI backend mid-stream → verify partial response is preserved + error shown
7. Remove both keys → verify "Ask AI" section is disabled + config banner appears

## Performance Considerations

- Anthropic `claude-haiku-4-5-20251001` is selected for latency (sub-second TTFT on typical requests). Model constant lives in `anthropic.ts` and can be changed without touching the interface.
- System prompt caching: the system prompt (NPC identity + relationships) is eligible for Anthropic's prompt cache. Not implemented in this plan — can be added by passing `cache_control` headers to the Anthropic API in a follow-up.
- Workers CPU time: LLM network await is free; the `TransformStream` processing is minimal. No performance concern at this scale.

## Migration Notes

No DB migrations required — this feature adds no new tables or columns.

## References

- Research: `context/changes/npc-ai-reaction/research.md`
- Supabase client factory template: `src/lib/supabase.ts:5-24`
- Config-status pattern: `src/lib/config-status.ts:1-21`
- Route convention: `src/pages/api/npcs/index.ts:8-70`
- Island mount pattern: `src/pages/campaigns/[id]/npcs/[npcId]/index.astro:83-90`
- Spinner pattern: `src/components/auth/SubmitButton.tsx:21-24`
- PRD: `context/foundation/prd.md` — FR-010, US-01
- Infrastructure: `context/foundation/infrastructure.md:63,71,93` — Workers CPU accounting

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: AI Client Foundation

#### Automated

- [ ] 1.1 `npm run build` succeeds with new optional env vars declared
- [ ] 1.2 `npm run lint` passes with no errors from AI module files
- [ ] 1.3 `npm run test` passes (existing tests unaffected)

#### Manual

- [ ] 1.4 `createAiClient()` returns null when both keys absent; Layout banner appears
- [ ] 1.5 `createAiClient()` returns `AnthropicClient` when `ANTHROPIC_API_KEY` is set; banner absent
- [ ] 1.6 `createAiClient()` returns `OllamaClient` when only `OLLAMA_BASE_URL` is set

### Phase 2: Prompt Builder + Unit Tests

#### Automated

- [ ] 2.1 `npm run test` passes — all `prompt.test.ts` cases green
- [ ] 2.2 `npm run lint` passes

#### Manual

- [ ] 2.3 Generated system prompt for a representative NPC reads naturally and includes all context sections

### Phase 3: Streaming API Endpoint

#### Automated

- [ ] 3.1 `npm run lint` passes on `reaction.ts`
- [ ] 3.2 `npm run build` succeeds

#### Manual

- [ ] 3.3 Valid POST request streams normalized SSE frames; last frame has `done: true`
- [ ] 3.4 Missing session → 401; invalid NPC id → 404; no AI keys → 503; empty scenario → 400
- [ ] 3.5 Partial stream on connection close handled gracefully
- [ ] 3.6 PATCH and DELETE /api/npcs/:id routing regression check passes

### Phase 4: React Island + Page Integration

#### Automated

- [ ] 4.1 `npm run lint` passes (no React Compiler violations)
- [ ] 4.2 `npm run build` succeeds

#### Manual

- [ ] 4.3 "Ask AI" section visible on NPC detail page below Relationships
- [ ] 4.4 Scenario submitted → spinner < 2s → text streams in character → stops cleanly
- [ ] 4.5 Re-submit replaces previous response
- [ ] 4.6 Mid-stream error: partial text preserved + red error message
- [ ] 4.7 Unconfigured state: section disabled + config hint + Layout banner
- [ ] 4.8 No regressions in NPC edit, campaign, or relationship flows
