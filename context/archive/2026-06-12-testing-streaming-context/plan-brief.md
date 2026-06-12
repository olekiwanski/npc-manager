# Test Phase 2 — Streaming and Context Correctness — Plan Brief

> Full plan: `context/changes/testing-streaming-context/plan.md`
> Research: `context/changes/testing-streaming-context/research.md`

## What & Why

Phase 2 of the test rollout closes two unprotected risks: the SSE parser in `NpcReaction.tsx` silently loses text when a chunk arrives mid-line (a confirmed MVP tradeoff), and no test verifies that `reaction.ts` actually passes the NPC's name and role as the Anthropic `system` parameter. Both risks were deferred from Phase 1 and are the only remaining gaps before the CI gate (Phase 3).

## Starting Point

Phase 1 shipped 6 tests covering validation, auth/IDOR, and missing API key. All stop at line ≤56 of `reaction.ts`; no test reaches `buildNpcSystemPrompt()` or `messages.stream()`. `NpcReaction.tsx` has no test file. The existing Anthropic mock returns `undefined` from `stream()`.

## Desired End State

Two new test files pass in `npm run test`. A fragmented-chunk SSE delivery yields complete text in the React state (lineBuffer fix applied). The `messages.stream()` call carries a `system` param containing the NPC's name and role. Stryker confirms the lineBuffer test kills the obvious regression mutant. `test-plan.md §6.3` is filled; Phase 2 is marked `complete`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Bug fix in scope | Fix lineBuffer in this change | A permanently red test is worse than a red→green cycle; the fix is one line | Plan |
| Phase order | Risk #4 first | No code fix needed; cheapest win first; establishes async-iterable mock pattern | Plan |
| Stryker gate | Yes, narrow run on NpcReaction.tsx | Confirms the fragmentation test is non-trivial and would catch a regression | Plan |
| Risk #4 oracle | system ∋ NPC name + role only | Test plan §2 specifies this; relationship wiring is proven by existing unit tests | Research |
| TDD for Risk #3 | TDD-eligible (red before fix, green after) | Failing assertion is fully nameable; red→green proves protection exists | Plan |
| Anthropic mock pattern | vi.hoisted() + async iterable | vi.mock is hoisted; vi.hoisted() is the only way to capture the stream call args | Research |

## Scope

**In scope:**
- `reaction.context.test.ts` — 1 test: Anthropic `system` param contains NPC name + role
- `NpcReaction.test.tsx` — 2 tests: fragmented chunk → complete text; complete frame → same
- `NpcReaction.tsx` — lineBuffer fix (one variable, one accumulation line, one pop)
- `stryker.config.mjs` — minimal Vitest runner config + one mutation run
- `test-plan.md §6.3` — cookbook entry; §3 Phase 2 → `complete`

**Out of scope:**
- AI response content assertions (non-deterministic oracle)
- Supabase integration tests (project constraint)
- CI gate (Phase 3 of the rollout)

## Architecture / Approach

Phase 1 (Risk #4): New test file extends the existing `reaction.test.ts` mock infrastructure. The key addition is a `vi.hoisted()` Anthropic mock that returns an async iterable AND exposes the `stream()` call args for assertion. Supabase mock extended to sequence three queries via `mockReturnValueOnce`. Phase 2 (Risk #3): New component test file renders `NpcReaction` in jsdom, delivers a `ReadableStream` with a fragmented SSE frame, asserts accumulated text state. Then a one-line fix is applied to the component. Stryker confirms the fix is mutation-tested.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Route context-wiring test | 1 test; Anthropic `system` param assertion; no code fix | vi.hoisted mock pattern is non-obvious |
| 2. SSE fragmentation test + fix | 2 tests + lineBuffer fix; red→green TDD cycle | ReadableStream mock must faithfully simulate TCP fragmentation |
| 3. Stryker gate | Mutation report; lineBuffer mutant killed | Stryker not currently installed; setup adds a step |
| 4. Cookbook + rollout status | §6.3 filled; Phase 2 complete | None — documentation only |

**Prerequisites:** Phase 1 (reaction-api-integrity) complete ✓; Vitest configured ✓; jsdom support via per-file directive ✓  
**Estimated effort:** ~2 focused sessions across 4 phases

## Open Risks & Assumptions

- `NpcReaction.tsx` component props are assumed to include `npcId: string`; verify at top of Phase 2 before rendering in tests
- Stryker + `@stryker-mutator/vitest-runner` compatibility with Vitest 4.x is assumed current — verify at install time
- The route's three Supabase queries are assumed to run in a fixed call order (`from("npcs")` → `from("npc_has_npc")` → `from("npcs")`); verify in `reaction.ts:49-65` before building the sequenced mock

## Success Criteria (Summary)

- `npm run test` passes with all new tests green; fragmentation test was red before the lineBuffer fix
- Stryker HTML report shows lineBuffer-accumulation mutant killed
- `test-plan.md §3` Phase 2 row shows `complete`
