# NPC AI Reaction — Plan Brief

> Full plan: `context/changes/npc-ai-reaction/plan.md`
> Research: `context/changes/npc-ai-reaction/research.md`

## What & Why

Build S-04 — the roadmap north star. A GM opens an NPC detail page, submits a natural-language scenario, and receives a **streamed** in-character AI response within 2 seconds (FR-010 / US-01). The response draws on the NPC's role, traits, and all known relationships. No state is mutated; re-query is always available.

## Starting Point

All prerequisite data (S-01–S-03) is in place: `npcs` and `npc_has_npc` tables with RLS, the S-03 relationship fetch pattern, and a consistent API/island convention to mirror. No AI SDK is installed and no streaming exists anywhere in the codebase — both the AI client layer and the SSE plumbing are greenfield.

## Desired End State

A third "Ask AI" section card appears below the Relationships card on every NPC detail page. The GM types a scenario, submits, sees a spinner immediately, and watches the in-character response stream in. Re-submitting replaces the previous response. When no AI key is configured the section renders as disabled with a config hint and the existing Layout banner fires automatically.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Wire format | SSE frames (`text/event-stream`) | Both backends normalized via `TransformStream` to custom `{text,done}` frames; single client reader | Plan |
| AI backends | Both Anthropic + Ollama | Locally testable without API keys; matches shape-notes design constraint | Research / Plan |
| Prompt structure | System prompt = NPC identity; user message = scenario | Clean separation; system prompt eligible for Anthropic caching | Plan |
| Relationship context | All relationships, no cap | PRD: relationships enrich not gate; NPCs won't have hundreds in practice | Research / Plan |
| Stream errors | Partial response + inline error | User sees recovered context; re-query is immediately available | Plan |
| Re-query | Replace on re-submit | Clean state, matches single-active-question mental model | Plan |
| UI placement | Always-visible section below Relationships | Immediately discoverable; matches two-section layout pattern | Plan |
| Testing | Unit-test `buildSystemPrompt`; exclude AI clients from coverage | Prompt builder is a pure function, clients make external calls | Plan |
| Unconfigured state | Disabled section + config hint | Feature visible so GM knows to configure; config banner is free | Plan |

## Scope

**In scope:**
- `src/lib/ai/` — `interface.ts`, `anthropic.ts`, `ollama.ts`, `index.ts`, `prompt.ts`
- `POST /api/npcs/[id]/reaction` — streaming endpoint with full auth + ownership guard
- `ReactionSection.tsx` — React island with streaming reader
- `astro.config.mjs`, `config-status.ts`, `vitest.config.ts` — integration touch-points
- Unit tests for `buildSystemPrompt`

**Out of scope:**
- Response persistence (no new DB tables)
- Multi-turn conversation history
- Relationship count cap or filtering
- Anthropic prompt-cache headers (follow-up optimization)
- Ollama model configuration UI

## Architecture / Approach

Both AI backends normalize to a single SSE wire format (`data: {"text":"…","done":false}\n\n` / `data: {"done":true}\n\n`) via `TransformStream` inside each client. The endpoint calls `aiClient.react()` and returns the streaming `Response` directly — no buffering at the API layer. The React island consumes it with `fetch` + `getReader()`, buffering bytes across `\n\n` frame boundaries before parsing. `aiEnabled` is derived server-side from env vars and passed as a prop; the island renders a disabled state when false.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. AI Client Foundation | env vars, factory, AnthropicClient, OllamaClient, config-status wiring | TransformStream + Workers streaming pattern is net-new |
| 2. Prompt Builder + Tests | Pure `buildSystemPrompt()` function + unit tests | Prompt quality only validated manually at this stage |
| 3. Streaming API Endpoint | `POST /api/npcs/[id]/reaction` — full auth, context assembly, streaming | SSE frame buffering gotcha on server side |
| 4. React Island + Integration | `ReactionSection.tsx` + NPC detail page wired up | SSE frame buffering gotcha on client side; spinner timing |

**Prerequisites:** Supabase running locally (S-01–S-03 data), and either `ANTHROPIC_API_KEY` or `OLLAMA_BASE_URL` set in `.dev.vars` for end-to-end testing.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- Ollama is dev-only (localhost unreachable from deployed Cloudflare Workers) — `AnthropicClient` is the only prod path.
- `ANTHROPIC_API_KEY` must exist as a Cloudflare Workers Secret before deploying — owner: user, non-blocking for planning.
- Anthropic `claude-haiku-4-5-20251001` TTFT is assumed < 2 s for typical NPC context sizes — not validated under load.
- Prompt quality (in-character fidelity) is a manual judgment call; no automated quality gate.

## Success Criteria (Summary)

- GM submits a scenario and sees streamed in-character text within 2 seconds (FR-010 / US-01)
- Unconfigured state surfaces a clear, actionable config hint without breaking the page
- No regressions in any existing NPC, campaign, or relationship flow
