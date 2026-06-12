# Test Phase 2 — Streaming and Context Correctness

## Overview

Two tests covering risks #3 and #4 from `context/foundation/test-plan.md §2`:

- **Risk #4**: Prove `reaction.ts` calls `client.messages.stream()` with a `system` parameter containing the queried NPC's name and role.
- **Risk #3**: Prove `NpcReaction.tsx` accumulates complete text when an SSE chunk arrives split mid-line; apply the `lineBuffer` fix that makes the test green.

Phase order: Risk #4 first (no code fix, extends existing mock infrastructure), Risk #3 second (needs fix, new component test surface), Stryker gate third, cookbook update last.

## Current State Analysis

All 5 tests in `reaction.test.ts` stop at the validation/auth guards (lines ≤56 of `reaction.ts`). No test reaches `buildNpcSystemPrompt()` (line 70) or `client.messages.stream()` (line 79). The existing Anthropic mock (`{ stream: vi.fn() }`) returns `undefined` from `stream()`; any test that reaches the `for await` loop throws `TypeError: undefined is not iterable`.

`NpcReaction.tsx` has no test file. `NpcReaction.tsx:59` splits each decoded chunk on `\n` independently — no cross-chunk line buffer — which silently loses text when a `data:` line is split across two TCP reads. This was an explicit MVP tradeoff (`npc-ai-reaction/plan.md:221`).

## Desired End State

- `src/pages/api/npcs/[id]/reaction.context.test.ts` — 1 new test case proving the Anthropic call receives `system` ∋ NPC name + role.
- `src/components/npcs/NpcReaction.test.tsx` — 2 new test cases (fragmented → complete text; complete frame → same).
- `src/components/npcs/NpcReaction.tsx` — lineBuffer fix applied; fragmentation case green.
- `stryker.config.mjs` — Stryker wired to Vitest runner; lineBuffer-deletion mutant killed.
- `context/foundation/test-plan.md` — §6.3 filled; §3 Phase 2 → `complete`.

### Key Discoveries

- `src/components/npcs/NpcReaction.tsx:59` — `chunk.split("\n")` without buffer (the bug)
- `src/pages/api/npcs/[id]/reaction.ts:70` — `buildNpcSystemPrompt(npc, rels, roster)` — the integration point to assert
- `src/pages/api/npcs/[id]/reaction.ts:79-84` — `messages.stream({ system: systemPrompt, … })` — the Anthropic call to capture
- `src/pages/api/npcs/[id]/reaction.ts:58-65` — two parallel queries after the NPC lookup (relationship + roster); both must resolve in the mock
- `src/pages/api/npcs/[id]/reaction.test.ts` — `makeContext` and `makeSupabaseMock` helpers; double-cast pattern; re-use in Phase 1
- `src/components/npcs/NpcList.test.tsx:1,9-17` — jsdom env directive + `vi.stubGlobal("fetch", ...)` setup/teardown; canonical pattern for Phase 2

## What We're NOT Doing

- Not asserting AI response content (non-deterministic oracle — test-plan §7)
- Not testing the full SSE pipeline end-to-end from the API route side (Risk #3 is a component-level concern)
- Not adding Supabase integration tests (project constraint: all tests fully mocked)
- Not adding test coverage for the relationship-building logic inside `buildNpcSystemPrompt` (already covered by `npc-reaction.test.ts`)
- Not adding a CI gate — that is Phase 3 of the rollout

## Implementation Approach

Four phases ordered by cost × signal. Phase 1 (Risk #4) extends the existing test infrastructure and requires no code fix. Phase 2 (Risk #3) is TDD-eligible: the first failing assertion is fully nameable before touching production code. Phase 3 runs Stryker narrowly on `NpcReaction.tsx`. Phase 4 closes the rollout phase.

## Critical Implementation Details

**Anthropic mock must use `vi.hoisted()`** (Phase 1): `vi.mock()` factories are hoisted before all import declarations and variable initializations. A `const mockStreamCall = vi.fn()` at module scope is not yet initialized when the factory runs — the variable is `undefined` inside the factory. Use `vi.hoisted()` to create a reference that is available both inside the factory and in assertions:

```typescript
const mockStreamCall = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      yield { type: "message_stop" };
    },
  })
);
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: mockStreamCall },
  })),
}));
```

After the handler runs, `mockStreamCall.mock.calls[0][0]` holds the `messages.stream()` argument object; assert `system` from that.

**Supabase mock must support three sequential queries** (Phase 1): After the NPC lookup (`maybeSingle()`), the route runs two parallel queries — `from("npc_has_npc")…or()` and `from("npcs")…eq()` (roster). Both of these awaited expressions must resolve to `{ data: [...], error: null }`. The `or()` and the final `eq()` in the respective chains must be thenables (return resolved promises), not `mockReturnThis()`. Use `mockReturnValueOnce` on `from()` to return three separate chain objects in call order; the NPC chain terminates with `maybeSingle()`, the relationship chain terminates with `or().mockResolvedValue(...)`, and the roster chain terminates with its second `eq().mockResolvedValue(...)`. The roster chain's `eq` is called twice (once for `campaign_id`, once for `user_id`), and the chain object is self-referential — use two-step initialization to avoid a circular reference:

```typescript
const rosterChain: any = {};
rosterChain.select = vi.fn().mockReturnValue(rosterChain);
rosterChain.eq = vi.fn()
  .mockReturnValueOnce(rosterChain)                                         // first .eq: return chain
  .mockResolvedValueOnce({ data: [npcFixture], error: null });              // second .eq: thenable
```

**`lineBuffer` placement** (Phase 2): The buffer variable is initialized once before the `outer: for (;;)` loop. Inside the loop body, after `decoder.decode(value, { stream: true })` assigns `chunk`, append to buffer and split immediately. `lines.pop()` retains the incomplete trailing line. The existing inner loop body (`startsWith("data: ")`, `slice(6)`, `JSON.parse`, `setError`, `setReactionText`) is unchanged.

---

## Phase 1: Risk #4 — Route context-wiring test

### Overview

A single new test file exercises the full happy path of `reaction.ts` — all guards pass, Supabase returns a fully-populated NPC, Anthropic mock captures the call — and asserts that `messages.stream()` received a `system` parameter containing the NPC's name and role. No production code changes.

### Changes Required

#### 1. New test file

**File**: `src/pages/api/npcs/[id]/reaction.context.test.ts`

**Intent**: Extend the reaction test suite with a happy-path case that proves the route wires `buildNpcSystemPrompt`'s output to the Anthropic call. Co-located with `reaction.test.ts` per §6.2 convention.

**Contract**:
- Three `vi.mock()` calls at file top (same three modules as `reaction.test.ts` §6.2: `astro:env/server`, `@/lib/supabase`, `@anthropic-ai/sdk`).
- Anthropic mock uses the `vi.hoisted()` pattern (see Critical Implementation Details). The `mockStreamCall` mock must yield at least one event before closing (e.g., `{ type: "message_stop" }`) so the `for await` loop in the route completes without error.
- `makeContext` and the double-cast call pattern are reused from `reaction.test.ts` §6.2. The context must include a valid user (`{ id: "user-a" }`), valid body (`{ scenario: "The party confronts the merchant." }`), and the NPC id `"npc-1"`.
- NPC fixture: `{ id: "npc-1", name: "Gareth", role: "merchant", traits: "clever, greedy", campaign_id: "campaign-1", user_id: "user-a" }`.
- Supabase `from()` returns three chains via `mockReturnValueOnce` in call order: (1) NPC chain — `maybeSingle()` resolves to `{ data: npcFixture, error: null }`; (2) relationship chain — `or()` resolves to `{ data: [], error: null }`; (3) roster chain — final `eq()` resolves to `{ data: [npcFixture], error: null }`.
- Test case title: `"calls messages.stream with a system prompt containing the NPC name and role for a fully-populated NPC"`.
- Assertions after awaiting the handler: `expect(mockStreamCall).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("Gareth") }))` and the same for `"merchant"`.

### Success Criteria

#### Automated Verification

- `npm run test` passes (all existing tests + new test green)
- `npm run lint` passes

#### Manual Verification

> Agent note: perform this step yourself before requesting user confirmation — comment out the line, run the test suite to confirm the new test goes red, then restore and re-run to confirm green.

- Sanity: comment out `system: systemPrompt` in `reaction.ts:82`, confirm the new test goes red, then restore

---

## Phase 2: Risk #3 — SSE fragmentation test + lineBuffer fix

### Overview

A new component test for `NpcReaction.tsx` delivers a `ReadableStream` with an SSE `data:` line split across two chunks. The test is initially red. Apply the `lineBuffer` fix. Verify red → green without breaking the complete-frame case.

This phase is TDD-eligible: the failing assertion is fully nameable before writing any production code — "when a `data:` line is split across two chunks, `reactionText` state equals the complete reconstructed text."

### Changes Required

#### 1. New component test file

**File**: `src/components/npcs/NpcReaction.test.tsx`

**Intent**: Render `NpcReaction` in a jsdom environment, submit a scenario via the form, and assert that the streamed text is fully accumulated regardless of whether the SSE frame arrived in one chunk or two.

**Contract**:
- `// @vitest-environment jsdom` directive at line 1.
- `vi.stubGlobal("fetch", fetchMock)` in `beforeEach`; `vi.unstubAllGlobals()` in `afterEach` — pattern from `NpcList.test.tsx:9-17`.
- `makeFragmentedStream(chunks: string[])` helper: returns a `ReadableStream` whose `pull(controller)` enqueues `new TextEncoder().encode(chunks[i++])` on each call, then closes when `i >= chunks.length`.
- `fetchMock` is configured to resolve `{ ok: true, status: 200, body: makeFragmentedStream([...]) }`.
- Props are `{ npcId: string }` (`NpcReaction.tsx:6-8`); render with `render(<NpcReaction npcId="npc-1" />)`.
- Two required test cases:
  1. `"accumulates complete text when SSE data line is split across two chunks"` — chunks: `['data: {"text":"hel', 'lo world"}\n\ndata: [DONE]\n\n']`. Assert: `await screen.findByText("hello world")` and no error element in DOM.
  2. `"accumulates complete text when SSE data line arrives in a single chunk"` — chunk: `'data: {"text":"hello world"}\n\ndata: [DONE]\n\n'`. Assert same outcome. This case must be green before AND after the fix (non-regression anchor).

#### 2. lineBuffer fix

**File**: `src/components/npcs/NpcReaction.tsx`

**Intent**: Eliminate the per-chunk `split("\n")` that discards partial lines when a frame spans two reads. The fix introduces a `lineBuffer` string that accumulates decoded text across chunks and splits only on complete lines.

**Contract**: Replace the existing single-line `for (const line of chunk.split("\n"))` loop with the three-step pattern described in Critical Implementation Details. All inner-loop logic (`startsWith("data: ")`, `slice(6)`, `JSON.parse`, `setError`, `setReactionText`) is unchanged.

### Success Criteria

#### Automated Verification

- Test case 1 (fragmented) is red against the current code before the fix, green after
- Test case 2 (complete frame) is green before and after the fix
- `npm run test` passes (all tests)
- `npm run lint` passes

#### Manual Verification

- None — changes confined to the streaming loop and its test

---

## Phase 3: Stryker mutation gate

### Overview

Confirm that the fragmentation test catches a regression: a mutant that resets `lineBuffer` to `""` per-chunk (reverting to the pre-fix behavior) must be killed. Stryker is not currently configured; Phase 3 installs and configures it.

### Changes Required

#### 1. Stryker config and dependencies

**File**: `stryker.config.mjs` (new, project root)

**Intent**: Minimal Stryker configuration for a Vitest-backed mutation run. Scoped mutation paths are passed via `--mutate` flag at runtime; this config only sets the runner and reporters.

**Contract**: Before installing, run `npm info @stryker-mutator/vitest-runner peerDependencies` to confirm Vitest 4.x support. If the runner does not support Vitest 4.x, fall back to the manual sanity approach from step 1.2 (comment out the lineBuffer accumulation line, observe test 1 goes red, restore — equivalent evidence without Stryker). If compatible, install `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` as dev dependencies; config exports an object with `testRunner: "vitest"`, `reporters: ["html", "progress"]`, and no global `mutate` glob (keeps full-repo runs opt-in).

#### 2. Mutation run and report review

**Intent**: Execute a narrow mutation run on `NpcReaction.tsx`, open the HTML report, and consciously evaluate each survived mutant in the `lineBuffer` region.

**Contract**: Run `npx stryker run --mutate "src/components/npcs/NpcReaction.tsx"`. Open `reports/mutation/index.html`. For each survived mutant in the buffer accumulation region: if removing or resetting the buffer would cause data loss for a user → add an assertion that kills it. If the mutant is cosmetically equivalent (e.g., variable rename) → document it as ignored. Do not chase 100% mutation score.

### Success Criteria

#### Automated Verification

- `npx stryker run --mutate "src/components/npcs/NpcReaction.tsx"` exits without error
- HTML report generated at `reports/mutation/index.html`

#### Manual Verification

- lineBuffer-accumulation mutant (e.g., `lineBuffer = ""` reset inside the loop instead of `lineBuffer = lines.pop()!`) is killed by the fragmentation test case
- All survived mutants reviewed; any that represent real regressions addressed

---

## Phase 4: Cookbook update + rollout status

### Overview

Fill §6.3 of `test-plan.md` with the streaming component test pattern established by `NpcReaction.test.tsx`. Mark §3 Phase 2 as `complete`.

### Changes Required

#### 1. §6.3 cookbook entry

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the `TBD — see §3 Phase 2` placeholder in §6.3 with a self-contained description of the streaming component test pattern so future contributors can replicate it without reading `NpcReaction.test.tsx` first.

**Contract**: §6.3 must cover: (a) file location (`src/components/npcs/NpcReaction.test.tsx`), (b) `// @vitest-environment jsdom` directive, (c) `makeFragmentedStream` helper shape (ReadableStream + pull controller), (d) `vi.stubGlobal("fetch", fetchMock)` setup in `beforeEach` / `vi.unstubAllGlobals()` in `afterEach`, (e) assertion pattern using `screen.findByText` (async — waitFor equivalent), (f) a note that the SSE frame format is `data: ${JSON.stringify({ text })}\n\n` and `data: [DONE]\n\n`. Mirror the conciseness of §6.1 and §6.2 entries.

#### 2. Rollout phase status

**File**: `context/foundation/test-plan.md`

**Intent**: Update §3 Phase 2 row to reflect completion.

**Contract**: Set Phase 2 Status cell to `complete`. Change folder is already set to `testing-streaming-context`.

### Success Criteria

#### Automated Verification

- `context/foundation/test-plan.md §3` Phase 2 row shows `complete`
- `npm run lint` passes (no markdown lint errors if configured)

#### Manual Verification

- §6.3 cookbook entry is self-contained: a reader unfamiliar with `NpcReaction.test.tsx` can follow it to add a new streaming component test

---

## Testing Strategy

### Unit Tests

- `reaction.context.test.ts`: populated NPC → `messages.stream` called with `system` ∋ name + role
- `NpcReaction.test.tsx`: fragmented chunk → complete text accumulation (red before fix, green after); complete frame → same result (non-regression anchor)

### Integration Tests

- None — project constraint: all tests fully mocked (test-plan §7)

### Manual Testing Steps

- All verification is automated for Phases 1–2; mutation report review is the manual step for Phase 3

## References

- Research: `context/changes/testing-streaming-context/research.md`
- §6.2 cookbook (existing API route test pattern): `context/foundation/test-plan.md §6.2`
- Existing reaction tests: `src/pages/api/npcs/[id]/reaction.test.ts`
- Existing component test pattern: `src/components/npcs/NpcList.test.tsx:1,9-17`
- Archive — MVP SSE tradeoff note: `context/archive/2026-06-07-npc-ai-reaction/plan.md:221`
- Archive — Phase 1 streaming deferral: `context/archive/2026-06-08-reaction-api-integrity/plan.md:26-30`
- Archive — guard ordering: `context/archive/2026-06-08-reaction-api-integrity/research.md:42-53`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Risk #4 — Route context-wiring test

#### Automated

- [x] 1.1 `npm run test` passes with new test green (all existing tests + reaction.context.test.ts) — c1919b5
- [x] 1.2 `npm run lint` passes — c1919b5

#### Manual

- [x] 1.3 Sanity: comment out `system: systemPrompt` in reaction.ts, confirm new test goes red, then restore — c1919b5

### Phase 2: Risk #3 — SSE fragmentation test + lineBuffer fix

#### Automated

- [x] 2.1 Fragmentation test case is red before the lineBuffer fix — 972a885
- [x] 2.2 Complete-frame test case is green before the lineBuffer fix — 972a885
- [x] 2.3 `npm run test` passes (all tests green) after the lineBuffer fix — 972a885
- [x] 2.4 `npm run lint` passes — 972a885

#### Manual

- [x] 2.5 No manual verification required for this phase — 972a885

### Phase 3: Stryker mutation gate

#### Automated

- [ ] 3.1 `npx stryker run --mutate "src/components/npcs/NpcReaction.tsx"` exits without error
- [ ] 3.2 HTML report generated at `reports/mutation/index.html`

#### Manual

- [ ] 3.3 lineBuffer-accumulation mutant killed by fragmentation test case; survived mutants reviewed and consciously accepted or addressed

### Phase 4: Cookbook update + rollout status

#### Automated

- [ ] 4.1 `context/foundation/test-plan.md §3` Phase 2 row shows `complete`

#### Manual

- [ ] 4.2 §6.3 cookbook entry is self-contained; a reader unfamiliar with NpcReaction.test.tsx can follow it to add a new streaming component test
