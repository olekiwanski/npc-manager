# CI Test Gate Implementation Plan

## Overview

Wire `npm run test` as a required CI step in `.github/workflows/ci.yml`, placing it after lint and before build. Update `context/foundation/test-plan.md §6.4` with the finalized pattern. This is Phase 3 of the phased test rollout — the gate that prevents any regression from shipping without tests running.

## Current State Analysis

The CI workflow (`ci.yml`) runs five steps: checkout → setup-node → npm ci → astro sync → lint → build. Tests run locally as a social contract (AGENTS.md) but nothing enforces them — a developer who forgets can ship a regression. Phases 1 and 2 are complete: 14 test files cover Risks #1–#5, all passing locally, all fully mocked (no real secrets needed).

## Desired End State

`npm run test` runs in CI on every push and PR to `master`, positioned between lint and build. Test failures block the job. `test-plan.md §6.4` documents the finalized pattern for future contributors.

### Key Discoveries:

- `.github/workflows/ci.yml:1–25` — current 5-step workflow; test step absent
- `package.json:8` — `"test": "vitest run"` (single pass, exits 1 on any failure)
- `vitest.config.ts:1–19` — no changes needed; `@` alias and `node` env already configured
- All 14 test files mock `astro:env/server`, Supabase, and Anthropic SDK — no real secrets needed for the test step; no `env:` block required
- `astro sync` runs as a dedicated step before lint, so `.astro/` types are available regardless of placement relative to build
- `context/foundation/test-plan.md:265–267` — §6.4 currently reads `"TBD — see §3 Phase 3"`

## What We're NOT Doing

- Not modifying any source files, test files, or `vitest.config.ts`
- Not adding new GitHub Actions secrets (tests need none)
- Not adding `--reporter` flags to the test command
- Not updating `test-plan.md §3` Phase 3 status row — that is the orchestrator's responsibility
- Not adding `timeout-minutes` to the test step (14 mocked tests; no hang risk)
- Not adding `continue-on-error` — failing tests must block the CI job

## Implementation Approach

Two file edits, shipped as a single atomic commit. The CI change is a one-line YAML insert; the cookbook update documents the pattern so future contributors know the gate shape without re-deriving it.

---

## Phase 1: Wire CI gate and update cookbook

### Overview

Add `npm run test` to the CI workflow after lint and before build. Fill in `test-plan.md §6.4` with the finalized CI pattern, placement rationale, and secrets note.

### Changes Required:

#### 1. CI workflow — add test step

**File**: `.github/workflows/ci.yml`

**Intent**: Insert `- run: npm run test` as a new step between `npm run lint` and `npm run build`, making test failures block every push and PR to `master`.

**Contract**: The new step has no `env:` block. Final step order: `npm ci` → `npx astro sync` → `npm run lint` → `npm run test` → `npm run build` (the build step retains its existing `env: SUPABASE_URL / SUPABASE_KEY` block unchanged).

#### 2. Cookbook — fill in §6.4

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the `TBD — see §3 Phase 3` placeholder in §6.4 with the finalized CI pattern so future contributors know exactly how the gate is wired, where it sits, and why no secrets are needed.

**Contract**: The §6.4 entry covers: the exact YAML step, placement (after lint, before build), the rationale (astro sync already ran; tests need no build output; fail fast), and a note that no `env:` block is needed because all dependencies are mocked via `vi.mock`.

### Success Criteria:

#### Automated Verification:

- Tests pass locally: `npm run test`
- Lint passes (no regressions from the test-plan.md edit): `npm run lint`

#### Manual Verification:

- Open `.github/workflows/ci.yml` and confirm step order: lint → test → build
- Open `test-plan.md §6.4` and confirm the TBD placeholder is replaced with the finalized pattern
- Push the branch; confirm the GitHub Actions run includes the test step and it passes

---

## Testing Strategy

No new tests are written for this change — the change is itself the CI gate for existing tests.

### Manual Testing Steps:

1. Run `npm run test` locally to confirm all 14 tests pass after the YAML edit
2. Run `npm run lint` locally to confirm the test-plan.md edit passes lint/format checks
3. Push to a branch; observe the GitHub Actions log and confirm the test step appears between lint and build

## References

- Research: `context/changes/testing-ci-gate/research.md`
- CI workflow: `.github/workflows/ci.yml`
- Cookbook entry to fill: `context/foundation/test-plan.md:265–267`
- test-plan §3 Phase 3 goal: `context/foundation/test-plan.md:79–80`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Wire CI gate and update cookbook

#### Automated

- [x] 1.1 Tests pass locally: `npm run test` — d5b2e4b
- [x] 1.2 Lint passes: `npm run lint` — d5b2e4b

#### Manual

- [x] 1.3 Step order confirmed in `.github/workflows/ci.yml` (lint → test → build) — d5b2e4b
- [x] 1.4 §6.4 TBD placeholder replaced with finalized pattern — d5b2e4b
- [x] 1.5 CI run passes in GitHub Actions with test step visible
