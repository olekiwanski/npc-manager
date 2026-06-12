---
date: 2026-06-12T00:00:00+00:00
researcher: claude-sonnet-4-6
git_commit: 518a58d7b73c6aea63ba65917abb78ef87155c80
branch: update-claude-md-m3l2
repository: 10xdevs
topic: "Phase 2 test grounding — SSE streaming fragmentation (Risk #3) and NPC context correctness (Risk #4)"
tags: [research, testing, streaming, sse, npc-reaction, anthropic, vitest]
status: complete
last_updated: 2026-06-12
last_updated_by: claude-sonnet-4-6
---

# Research: Phase 2 Test Grounding — Streaming and Context Correctness

**Date**: 2026-06-12
**Researcher**: claude-sonnet-4-6
**Git Commit**: 518a58d7b73c6aea63ba65917abb78ef87155c80
**Branch**: update-claude-md-m3l2
**Repository**: 10xdevs

## Research Question

Ground the two risks for test-plan Phase 2: (1) does the SSE parser in `NpcReaction.tsx` handle chunks that arrive mid-line? (2) does the `reaction.ts` route actually pass the NPC system prompt as the `system` parameter to Anthropic, and is there any test that verifies this?

---

## Summary

**Risk #3 (SSE fragmentation) — REAL BUG, NO PROTECTION.**
`NpcReaction.tsx:59` splits each decoded chunk on `\n` independently with no cross-chunk line buffer. This is a confirmed MVP tradeoff (`npc-ai-reaction/plan.md:221`): "upgrade to a buffered parser if field testing reveals dropped chunks." A test using fragmented chunks will fail against current code. Both a fix and a test are needed.

**Risk #4 (NPC context absent) — IMPLEMENTATION CORRECT, TEST COVERAGE MISSING.**
The route does pass `buildNpcSystemPrompt(npc, rels, roster)` output as `system` to Anthropic (`reaction.ts:70-84`). `buildNpcSystemPrompt` always returns a non-empty string (minimum: name + closing instruction). However, no existing test reaches this code path; the Anthropic mock captures nothing; and no assertion verifies the `system` parameter. The protection exists in the implementation but is unverified by any automated test.

---

## Detailed Findings

### Risk #3 — SSE Parser (NpcReaction.tsx)

**The parsing loop — `src/components/npcs/NpcReaction.tsx:51-75`:**

```typescript
// line 51
const reader = res.body.getReader();
// line 52
const decoder = new TextDecoder();
// ...
outer: for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  // line 58 — correct: stream:true handles multi-byte char boundaries
  const chunk = decoder.decode(value, { stream: true });
  // line 59 — BUG: each chunk is split independently, no cross-chunk buffer
  for (const line of chunk.split("\n")) {
    // line 60
    if (!line.startsWith("data: ")) continue;
    // line 61
    const raw = line.slice(6).trim();
    // line 62
    if (raw === "[DONE]") break outer;
    // line 64 — try JSON.parse; silent catch on line 73-75
    // line 71
    setReactionText((prev) => prev + text);
  }
}
```

**The fragmentation failure path:**

The SSE frame format written by the route is `data: ${JSON.stringify({ text })}\n\n`. If a TCP read returns a chunk that splits mid-line (e.g., chunk 1 = `data: {"tex`, chunk 2 = `t":"hello"}\n\n`):
- Chunk 1 is split on `\n` → one element: `data: {"tex`
- That element passes `startsWith("data: ")`, so `raw = '{"tex'`
- `JSON.parse('{"tex')` throws → caught silently → text is lost
- Chunk 2 is split → `t":"hello"}` does NOT start with `data: ` → skipped entirely
- Accumulated text: empty string (silent data loss)

**The correct fix** requires a `lineBuffer` string initialized to `""` before the loop, accumulating the tail of each chunk:

```typescript
let lineBuffer = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  lineBuffer += decoder.decode(value, { stream: true });
  const lines = lineBuffer.split("\n");
  lineBuffer = lines.pop()!;  // keep the last incomplete line
  for (const line of lines) { /* same logic */ }
}
```

**Historical confirmation:** `context/archive/2026-06-07-npc-ai-reaction/plan.md:221` explicitly deferred this: "uses simple `chunk.split('\n')` SSE parsing with no line buffer — works reliably for Cloudflare Workers' typical frame-complete flush behavior; upgrade to a buffered parser if field testing reveals dropped chunks."

**Component test patterns (from existing tests):**
- `// @vitest-environment jsdom` directive required at file top
- Mock fetch via `vi.stubGlobal("fetch", fetchMock)` in `beforeEach`
- Restore via `vi.unstubAllGlobals()` in `afterEach`
- `NpcList.test.tsx:1,9-17` and `NpcForm.test.tsx:1,9-17` — the canonical pattern

**How to mock the `ReadableStream` for fragmentation:**

```typescript
function makeFragmentedStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}
```

Call the component's submit, verify `screen.findByText("hello world")` (the accumulated text), verify error state is not set.

---

### Risk #4 — System Prompt Construction and Anthropic Call (reaction.ts)

**NPC query — `src/pages/api/npcs/[id]/reaction.ts:49`:**

```typescript
const npcResult = await supabase
  .from("npcs")
  .select()           // all columns — name, role, traits, campaign_id, user_id
  .eq("id", npcId)
  .eq("user_id", user.id)
  .maybeSingle();
```

**Relationship + roster queries — `src/pages/api/npcs/[id]/reaction.ts:58-65`:**

Two parallel queries:
1. `npc_has_npc` filtered by `campaign_id` + `.or(from_npc_id OR to_npc_id)` — relationships for this NPC
2. `npcs` filtered by `campaign_id` + `user_id` — roster for name lookups (user_id filter confirmed correct after F1 fix in Phase 1)

**System prompt construction — `src/pages/api/npcs/[id]/reaction.ts:70`:**

```typescript
const systemPrompt = buildNpcSystemPrompt(
  npc,
  relResult.data as Relationship[],
  rosterResult.data as Npc[]
);
```

**Anthropic call — `src/pages/api/npcs/[id]/reaction.ts:79-84`:**

```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: systemPrompt,
  messages: [{ role: "user", content: scenario }],
});
```

**`buildNpcSystemPrompt` null-handling — `src/lib/npc-reaction.ts:3-30`:**

| Field | Condition | Behaviour |
|-------|-----------|-----------|
| `npc.name` | always set | always included in identity line |
| `npc.role` | `role !== null` check at line 5 | omitted if null; role segment `, a ${role}` absent |
| `npc.traits` | `traits !== null` check at line 9 | entire "Personality and traits:" paragraph omitted |
| relationships array | `length > 0` check | entire relationships block omitted if empty |
| `rel.description` | `description !== null` at line 20 | description suffix omitted; shows type only |
| partner lookup | `partner ? partner.name : "an unknown NPC"` | fallback name if roster lookup fails |

**Minimum non-empty return** (NPC with no role, no traits, no relationships):
```
You are Gareth
Stay in character as Gareth...
```

This confirms the function never returns an empty or undefined string. The risk is not "empty system prompt" but "minimal system prompt that looks legitimate but contains no useful in-character context" — which the test plan correctly identifies as "GM receives a generic response indistinguishable from an in-character one."

**The integration gap confirmed:** No test in `reaction.test.ts` or `reaction.missing-key.test.ts` reaches `reaction.ts:70` (the `buildNpcSystemPrompt` call). All existing tests exercise only the guards (lines 22, 28-32, 37-44, 49-56). The Anthropic mock is `{ messages: { stream: vi.fn() } }` — `stream` returns `undefined`, so any test that reaches `reaction.ts:86` (the `for await` loop) throws `TypeError: undefined is not iterable`.

**What the Phase 2 test must do:**

1. Mock Supabase to return a fully-populated NPC (non-null role, non-null traits) from `maybeSingle()` and relationships from the `select()…or()` chain.
2. Mock the Anthropic `messages.stream()` to return an async iterable AND capture its call arguments.
3. Call `POST(makeContext({ user: validUser, body: { scenario: "…" } }))`.
4. Assert `mockStream` was called with `expect.objectContaining({ system: expect.stringContaining(npc.name) })` and `expect.stringContaining(npc.role)`.

**Anthropic async iterable mock pattern** (needed because `for await` in the route consumes the stream):

```typescript
const mockStreamCall = vi.fn().mockReturnValue({
  [Symbol.asyncIterator]: async function* () {
    yield { type: "content_block_delta", delta: { type: "text_delta", text: "test" } };
    yield { type: "message_stop" };
  },
});
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: mockStreamCall },
  })),
}));
```

The `mockStreamCall` variable is then available after the handler runs to assert:
```typescript
expect(mockStreamCall).toHaveBeenCalledWith(
  expect.objectContaining({
    system: expect.stringContaining("Gareth"),  // NPC name
  })
);
```

---

### Guard Order (relevant for Phase 2 test setup)

From `context/archive/2026-06-08-reaction-api-integrity/research.md:42-53`, the sequential guards are:

1. `ANTHROPIC_API_KEY` absent → 503 (line ~22)
2. `!user || !supabase` → 401 (line ~28)
3. Zod body schema → 400 (line ~37)
4. NPC query returns null → 404 (line ~52)
5. **`buildNpcSystemPrompt` call → line 70** ← Phase 2 tests must reach here
6. **`client.messages.stream()` call → line 79** ← Phase 2 must capture this

Phase 2 tests must ensure `ANTHROPIC_API_KEY` is set, `user` is populated, body is valid, and the Supabase mock returns a non-null NPC. Only then does execution reach the system prompt construction.

---

## Code References

- `src/components/npcs/NpcReaction.tsx:51-75` — SSE parsing loop (per-chunk split, no buffer)
- `src/components/npcs/NpcReaction.tsx:59` — the fragmentation bug: `chunk.split("\n")`
- `src/components/npcs/NpcReaction.tsx:11-14` — React state: `reactionText`, `isStreaming`, `error`
- `src/components/npcs/NpcReaction.tsx:71` — `setReactionText((prev) => prev + text)` — functional update form
- `src/pages/api/npcs/[id]/reaction.ts:49` — NPC Supabase query (all fields, double `.eq()`)
- `src/pages/api/npcs/[id]/reaction.ts:58-65` — parallel relationship + roster queries
- `src/pages/api/npcs/[id]/reaction.ts:70` — `buildNpcSystemPrompt(npc, rels, roster)` call site
- `src/pages/api/npcs/[id]/reaction.ts:79-84` — Anthropic `messages.stream({ system: systemPrompt, … })`
- `src/lib/npc-reaction.ts:3-30` — `buildNpcSystemPrompt` function; null guards at lines 5, 9, 20
- `src/lib/npc-reaction.test.ts:37-108` — 8 unit cases for prompt builder (all pass)
- `src/pages/api/npcs/[id]/reaction.test.ts:50-96` — 5 integration cases (validation + auth only; never reaches line 70)
- `src/pages/api/npcs/[id]/reaction.missing-key.test.ts:18-35` — 1 case (503 guard)
- `src/components/npcs/NpcList.test.tsx:1,9-17` — jsdom env + `vi.stubGlobal` pattern
- `src/components/npcs/NpcForm.test.tsx:1,9-17` — same pattern

## Architecture Insights

1. **The route is correct; only the component's parser and test coverage are wrong.** The Anthropic call at `reaction.ts:79-84` passes the system prompt correctly. Phase 2 tests prove the wiring by capturing the call args.

2. **`buildNpcSystemPrompt` never returns empty.** The minimum output is always the NPC's name + closing instruction. The meaningful risk is "minimal prompt without role/traits/relationships" — which is a correctness gap (GM gets a bad answer), not an error.

3. **The SSE fragmentation is a latent bug, not a theoretical one.** Under normal Cloudflare Workers operation, frames are likely flushed complete. But the Anthropic SDK can emit text deltas of varying sizes, and long responses increase the probability of a chunk boundary landing mid-line. The fix is a single `lineBuffer` variable — low-cost, high-value.

4. **Phase 2 Anthropic mock must be an async iterable.** The test plan §6.2 caveat noted `stream: vi.fn()` returns `undefined` and throws. The Phase 2 pattern must use `Symbol.asyncIterator` to let the `for await` in the route run without crashing.

5. **Component test approach for Risk #3**: Test the component through its React interface (render → submit → assert state). Do NOT test the parsing function in isolation (it's inlined in the component, not exported). The `ReadableStream` mock must simulate fragmentation at the SSE protocol level.

## Historical Context (from prior changes)

- `context/archive/2026-06-07-npc-ai-reaction/plan.md:221` — MVP tradeoff: naive `chunk.split('\n')` with explicit TODO to upgrade; Phase 2 buffering is the intended fix.
- `context/archive/2026-06-07-npc-ai-reaction/plan.md:284-287` — Integration tests were explicitly deferred to "Phases 3–5" (manual only); Phase 2 of the test rollout closes this gap.
- `context/archive/2026-06-07-npc-ai-reaction/plan.md:185` — Anthropic call design confirmed: `system: buildNpcSystemPrompt(...)`, same as what the route implements.
- `context/archive/2026-06-08-reaction-api-integrity/plan.md:26-30` — Phase 1 explicitly excluded streaming/happy-path tests; "that is Phase 2 (Risks #3 and #4) of the test rollout plan."
- `context/archive/2026-06-08-reaction-api-integrity/research.md:42-53` — Guard ordering confirmed; Phase 2 tests must clear all four guards to reach line 70.
- `context/archive/2026-06-08-reaction-api-integrity/research.md:73-82` — F1 fix: roster query now has `.eq("user_id", user.id)`; Phase 2 NPC mock must match this filter.

## Related Research

- `context/archive/2026-06-08-reaction-api-integrity/research.md` — Phase 1 grounding; guard order, IDOR fix, mutation-test assertion strategy
- `context/archive/2026-06-07-npc-ai-reaction/research.md` — Original AI reaction design; env var pattern, Anthropic SDK call shape

## Open Questions

1. **Should Phase 2 also fix the SSE bug, or only write a failing test that proves the gap?**
   The test plan (cost × signal) favours doing both in one change: write the failing test, then apply the one-line `lineBuffer` fix, then verify the test goes green. Splitting into "test first, fix in Phase 3" creates a permanently failing suite.

2. **What is the target "fully-populated NPC" shape for the Risk #4 mock?**
   From `src/lib/npc-reaction.ts` and `src/types.ts`, the NPC fixture needs at minimum: `{ id, name, role, traits, campaign_id, user_id }` with non-null `role` and `traits`. The research confirms `select()` fetches all columns, so the mock `maybeSingle()` return value drives the system prompt content.

3. **Does the Risk #4 test require a relationship mock, or is name+role sufficient as the oracle?**
   The test plan's response guidance says "containing NPC name and role" — testing just these two fields is sufficient to prove the route wires the system prompt. Relationship wiring is already proven by `npc-reaction.test.ts` unit tests. Use the simplest mock that proves the integration point.
