# NPC AI Reaction (S-04) — Plan Brief

> Full plan: `context/changes/npc-ai-reaction/plan.md`
> Research: `context/changes/npc-ai-reaction/research.md`
> SDK reference: `context/changes/npc-ai-reaction/anthropic-ai-sdk.md`

## What & Why

S-04 is the north star feature of NPC Manager: a GM types a natural-language scenario for a specific NPC and receives a streamed, in-character AI response grounded in that NPC's traits and named relationships. This is the slice that validates the core product bet — that AI reactions anchored in a GM's own structured NPC data are genuinely useful, unlike what any generic note tool can offer.

## Starting Point

The full CRUD stack (campaigns, NPCs, relationships) is done and merged. The Cloudflare Workers environment already has `nodejs_compat` and `output: "server"`, making it streaming-ready. `@anthropic-ai/sdk` is not yet installed and `ANTHROPIC_API_KEY` is not registered in the env schema.

## Desired End State

On the NPC detail page, below the existing relationships section, a GM sees a scenario textarea and an "Ask" button. After submitting, a spinner appears within 2 seconds, followed by streamed text that references the NPC by name, role, traits, and known relationship partners. On stream failure the partial text stays visible with an error message below it.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Env var access pattern | `astro:env/server` import | All existing secrets use this pattern — `locals.runtime.env` is untyped in this project | Research |
| System prompt content | Full profile + named relationships | Relationship grounding is the differentiator; omitting it produces a generic response | Plan |
| Partner depth in prompt | Name + type + description | One extra roster query; sufficient for in-character depth without recursive fetch risk | Plan |
| Streaming display | Typewriter (append chunks live) | Satisfies the 2-second visible feedback NFR; established pattern in AI-native UIs | Plan |
| Scenario input limit | 500 chars, required | Keeps prompts focused and token cost predictable for a "scenario query" use case | Plan |
| Mid-stream error UX | Show error, keep partial text | Partial text is valuable; erasing it on failure is more frustrating than an incomplete response | Plan |
| Testing coverage | Unit test prompt builder only | The prompt builder has the most nullable-field edge cases; streaming route relies on manual testing | Plan |
| Prompt builder location | `src/lib/npc-reaction.ts` (pure function) | Extractable, testable in isolation, consistent with existing `src/lib/` service pattern | Plan |

## Scope

**In scope:**
- Install `@anthropic-ai/sdk` and configure `ANTHROPIC_API_KEY` in env schema
- `buildNpcSystemPrompt()` pure function with unit tests (8 cases)
- `POST /api/npcs/[id]/reaction` SSE streaming endpoint
- `NpcReaction` React island (scenario form + typewriter display)
- Embed island in `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`

**Out of scope:**
- No DB migration (no new tables)
- No rate limiting
- No conversation history (single-turn only)
- No markdown rendering of responses
- No saving reactions to DB
- No model selector UI

## Architecture / Approach

Astro SSR API route builds the system prompt server-side from three Supabase queries (NPC, relationships, campaign roster), then opens a `client.messages.stream()` call with Claude. Text deltas are forwarded as SSE frames via a Web `ReadableStream` response. The React island (`client:load`) reads the stream with a `ReadableStream` reader, appending each `text` delta to component state for a typewriter effect. The system prompt builder is a pure function extracted to `src/lib/` so it can be unit tested independently.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Prerequisites & env config | SDK installed, `ANTHROPIC_API_KEY` in env schema | Needs a real API key in `.dev.vars` to verify manually |
| 2. System prompt builder + tests | Tested pure function handling all nullable NPC fields | Nullable field logic silently produces bad prompts if untested |
| 3. API route | Authenticated SSE streaming endpoint | First live integration with Anthropic API — rate limits or key issues surface here |
| 4. React streaming component | Typewriter display with error resilience | SSE chunk parsing fragility across network conditions |
| 5. Page integration | Full feature live on NPC detail page | Visual regression in existing page layout |

**Prerequisites:** Real `ANTHROPIC_API_KEY` must be in `.dev.vars` before Phase 1 manual check. All prior slices (S-01–S-03) are done and merged.  
**Estimated effort:** ~2–3 focused sessions across 5 phases.

## Open Risks & Assumptions

- Anthropic API key must be obtained and added to `.dev.vars` and Cloudflare secrets before deployment — this is on the user, not the implementation.
- `[id].ts` + `[id]/reaction.ts` file coexistence in Astro routing is assumed safe (different filesystem entries); confirmed by Astro's file-based routing design.
- `zod` is assumed installed (used in all existing API routes per AGENTS.md).

## Success Criteria (Summary)

- A GM submits a scenario for an NPC with traits and relationships and receives a streamed response that names at least one relationship partner in context.
- Visible feedback (spinner or first text chunk) appears within 2 seconds of submit on a local dev connection.
- All automated checks (build, lint, 8 unit tests) pass with no errors.
