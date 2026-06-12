# CI Test Gate — Plan Brief

> Full plan: `context/changes/testing-ci-gate/plan.md`
> Research: `context/changes/testing-ci-gate/research.md`

## What & Why

Add `npm run test` as a required CI step so no regression can ship without the test suite running. Today tests are a local courtesy (AGENTS.md says run them before pushing) but nothing enforces it — a developer who skips the local run lets a failure through. This is Phase 3 of the test rollout: close the gap between "tests exist" and "tests are required."

## Starting Point

`.github/workflows/ci.yml` runs lint and build on every push/PR but has no test step. Phases 1 and 2 delivered 14 passing tests (all mocked, no real secrets needed); the only missing piece is the CI gate itself.

## Desired End State

Every push and PR to `master` runs `npm run test` between lint and build. A failing test blocks the job. `test-plan.md §6.4` documents the finalized pattern so future contributors know the gate shape without re-deriving it.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Step placement | After lint, before build | `astro sync` already ran; tests need no build output, so failing fast avoids paying ~30–60s build cost on a logic regression | Plan |
| Reporter flag | None (default Vitest output) | Vitest auto-detects CI and produces a compact summary; 14 tests don't warrant verbose output | Plan |
| Phase structure | Single phase (CI + cookbook together) | Both changes are trivial; shipping them atomic means docs never say TBD while the gate is live | Plan |
| Secrets for test step | No `env:` block | All dependencies (`astro:env/server`, Supabase, Anthropic) are mocked via `vi.mock`; no real keys reach CI | Research |

## Scope

**In scope:**
- Add `- run: npm run test` to `.github/workflows/ci.yml` after lint, before build
- Fill in `context/foundation/test-plan.md §6.4` with the finalized pattern

**Out of scope:**
- Source files, test files, `vitest.config.ts` — no changes needed
- New GitHub Actions secrets — tests need none
- `test-plan.md §3` Phase 3 status row — orchestrator's responsibility
- `--reporter` flags, timeouts, `continue-on-error`

## Architecture / Approach

One-line YAML insert plus a documentation update, shipped as a single atomic commit. The test step sits between lint and build in the existing single-job workflow, with no `env:` block. No new infrastructure, no new tooling.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Wire CI gate and update cookbook | Test step live in CI; §6.4 filled in | Must observe a real CI run to confirm the step appears — a local lint pass on the YAML is not sufficient |

**Prerequisites:** Phases 1 and 2 of the test rollout complete (they are — 14 passing tests exist).  
**Estimated effort:** ~5 minutes implementation; one CI run to confirm.

## Open Risks & Assumptions

- Tests are assumed to pass on a clean `npm ci` install in `ubuntu-latest`. They've only been verified locally. If a transitive dep behaves differently in CI (e.g., jsdom version mismatch), the gate will surface it on the first run.
- The CI run must be observed after the change lands to confirm the step appears in the correct position.

## Success Criteria (Summary)

- `npm run test` passes locally after the YAML edit
- A push to GitHub shows the test step between lint and build in the Actions log
- `test-plan.md §6.4` no longer reads "TBD"
