# API Route Integrity Tests — Plan Brief

> Full plan: `context/changes/reaction-api-integrity/plan.md`
> Research: `context/changes/reaction-api-integrity/research.md`

## What & Why

Write Vitest tests that prove the `/reaction` endpoint enforces input validation, authentication, and environment key presence. These are the three untested risks from test-plan Phase 1 (§3): Zod validation (Risk #1), auth/ownership bypass (Risk #2), and missing API key crash (Risk #5).

## Starting Point

The route `src/pages/api/npcs/[id]/reaction.ts` is fully implemented and impl-reviewed. Two co-located test files exist in `src/lib/` but no route-level tests exist yet. `test-plan.md §6.2` is marked TBD.

## Desired End State

Six tests pass across two co-located files. `test-plan.md §6.2` contains the complete route-testing cookbook pattern. Phase 1 status in the rollout table advances to `complete`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Risk #5 file isolation | Separate test file | `vi.mock` is file-scoped and hoisted — `ANTHROPIC_API_KEY: undefined` in the same file as auth tests would infect all test cases | Research |
| Risk #2 assertion depth | Behavioral + `.eq()` spy | Behavioral-only check (just 404 status) doesn't catch the mutation where `user_id` filter is removed | Research |
| Phase structure | Two phases | Phase 1 verifies the mock scaffold before adding the trickier separate-file case in Phase 2 | Plan |
| Happy-path coverage | Excluded | Streaming happy path belongs to test-plan Phase 2 (Risks #3 and #4) | Test-plan |

## Scope

**In scope:** Zod rejection (empty, >500 chars, missing key), unauthenticated request, cross-user NPC IDOR, missing API key; cookbook §6.2 fill-in; Phase 1 status update.

**Out of scope:** Production code changes, streaming happy path, Supabase/Anthropic real calls, mutation testing (Stryker), CI gate wiring (test-plan Phase 3).

## Architecture / Approach

All three external dependencies (`astro:env/server`, `@/lib/supabase`, `@anthropic-ai/sdk`) are mocked at file top via hoisted `vi.mock`. The `POST` handler is imported and called directly with a hand-built `APIContext` — middleware never runs, so `locals.user` is injected per-test. A `makeSupabaseMock()` factory returns a fresh builder chain each `beforeEach` to prevent cross-test state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Mock scaffold + auth/validation tests | 5 tests for Risks #1 and #2 in `reaction.test.ts` | Guard ordering: Zod tests must inject valid user or auth guard fires first |
| 2. Missing-key test + cookbook | 1 test for Risk #5 in separate file; §6.2 filled; Phase 1 marked complete | `vi.mock` hoisting: wrong placement could silently skip the undefined key |

**Prerequisites:** None — route is already implemented and linting passes.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- Vitest resolves the `[id]` directory in `src/pages/api/npcs/[id]/reaction.test.ts` without issues (glob pattern `**/*.test.ts` matches it; the brackets are a filesystem artifact, not a glob character class in the matched path).
- `new Request(...)` constructor is available in Vitest's Node environment (Node 18+ native — confirmed by Node version in `.nvmrc`).
