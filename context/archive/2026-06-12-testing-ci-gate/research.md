---
date: 2026-06-12T00:00:00+00:00
researcher: Claude Sonnet 4.6
git_commit: 737f6d882657bf0e6e8dc6e6a628631b76664d49
branch: testing-streaming-context
repository: 10x-astro-starter
topic: "CI test gate: wiring npm run test into the GitHub Actions workflow"
tags: [research, ci, github-actions, vitest, testing]
status: complete
last_updated: 2026-06-12
last_updated_by: Claude Sonnet 4.6
---

# Research: CI test gate — wiring `npm run test` into GitHub Actions

**Date**: 2026-06-12  
**Researcher**: Claude Sonnet 4.6  
**Git Commit**: `737f6d882657bf0e6e8dc6e6a628631b76664d49`  
**Branch**: `testing-streaming-context`  
**Repository**: 10x-astro-starter

---

## Research Question

What needs to change in `.github/workflows/ci.yml` to add `npm run test` as a required gate, and what — if anything — must be configured differently for the test suite to run correctly in CI?

---

## Summary

This is a minimal, single-file change. Adding `- run: npm run test` to `.github/workflows/ci.yml` is sufficient. The test suite needs no real secrets and no new Vitest configuration: every test that touches `astro:env/server`, Supabase, or the Anthropic SDK mocks those dependencies at the top of the file via `vi.mock`. The only architectural decision for the plan is **placement** — before or after `npm run build`.

---

## Detailed Findings

### Current CI workflow

**File**: `.github/workflows/ci.yml`

The workflow has five steps today:

```
actions/checkout@v4
actions/setup-node@v4  (node 22, npm cache)
npm ci
npx astro sync          ← generates .astro/ types
npm run lint
npm run build           ← env: SUPABASE_URL, SUPABASE_KEY from secrets
```

`npm run test` does not appear. Tests are run locally before pushing (per AGENTS.md) but nothing enforces this — a regression can ship if a developer forgets.

### Test command and runner

**File**: `package.json:8`

```json
"test": "vitest run"
```

`vitest run` is a single-pass run (no watch), exits with code 1 on any failure. Correct for CI.

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "node",   // default; per-file override via // @vitest-environment jsdom
    ...
  },
  resolve: { alias: { "@": "/src" } },
});
```

No special configuration changes are needed for CI. The `@` alias and global API are already set up.

### Test surface (14 files, all mocked)

```
src/lib/utils.test.ts
src/lib/npc-reaction.test.ts
src/components/campaigns/CampaignCard.test.tsx
src/components/campaigns/CampaignForm.test.tsx
src/components/campaigns/CampaignList.test.tsx
src/components/npcs/NpcCard.test.tsx
src/components/npcs/NpcForm.test.tsx
src/components/npcs/NpcList.test.tsx
src/components/npcs/NpcReaction.test.tsx
src/components/relationships/RelationshipRow.test.tsx
src/components/relationships/RelationshipSection.test.tsx
src/pages/api/npcs/[id]/reaction.test.ts
src/pages/api/npcs/[id]/reaction.missing-key.test.ts
src/pages/api/npcs/[id]/reaction.context.test.ts
```

Phases 1 and 2 are complete — all 14 files exist and pass locally.

### Secrets and env vars

**Critical finding: tests need no real secrets.**

Every file that touches `astro:env/server` uses `vi.mock` to supply fake values:

```typescript
vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: "test-key",
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));
```

`reaction.missing-key.test.ts` overrides `ANTHROPIC_API_KEY: undefined` in its own `vi.mock` call (separate file because `vi.mock` is file-scoped and hoisted). All Supabase and Anthropic SDK calls are also mocked — no network traffic occurs during `npm run test`.

The `env:` block on `npm run build` (SUPABASE_URL, SUPABASE_KEY) is not needed on the test step. The test step should have **no `env:` block**.

### `astro:env/server` resolution in Vitest

This virtual module does not exist on disk. Vitest hoists `vi.mock("astro:env/server", factory)` before imports run, so the module is never actually resolved — the factory intercepts it. No `moduleNameMapper` or Vitest plugin is needed. All existing tests already prove this pattern works.

### Placement: before vs after build

**test-plan §6.4** specifies: "after the existing lint + build steps."

However, there is a reasonable alternative: run tests **after lint, before build**. Rationale:

| Placement | Pro | Con |
|-----------|-----|-----|
| After build (per §6.4 blueprint) | Build acts as a typecheck + Astro sync gate first; test job starts from a proven build | Wastes build time if tests fail; build itself doesn't catch logic regressions |
| After lint, before build | Fails fast on logic regressions without paying the ~30–60s build cost; `astro sync` already ran (types are available) | Slightly deviates from the §6.4 blueprint annotation |

`astro sync` already runs as a dedicated step before lint, so the `.astro/` type definitions are available regardless of placement. The `@` alias in `vitest.config.ts` resolves to `/src`, not to any build output.

**The plan should confirm placement.** The test-plan annotation is a note, not a binding decision — this is the one question that needs resolution.

### Cookbook §6.4 update

**File**: `context/foundation/test-plan.md:265–267`

The §6.4 entry currently reads `"TBD — see §3 Phase 3."` This phase must update it with the final pattern (the exact YAML step and placement rationale).

---

## Code References

- `.github/workflows/ci.yml:1–25` — current CI workflow (all 5 steps)
- `package.json:8` — `"test": "vitest run"`
- `vitest.config.ts:1–19` — Vitest config; no changes needed
- `src/pages/api/npcs/[id]/reaction.test.ts:6–10` — canonical `vi.mock("astro:env/server", ...)` pattern
- `src/pages/api/npcs/[id]/reaction.missing-key.test.ts` — separate-file pattern for undefined key guard
- `context/foundation/test-plan.md:265–267` — §6.4 TBD entry to fill in after implementation

---

## Architecture Insights

- **The change is infrastructure-only**: no source files, no test files, no Vitest config need to touch. The entire implementation is one `- run: npm run test` line in `.github/workflows/ci.yml`.
- **Secrets isolation is already correct**: the test suite was designed from Phase 1 to need no real secrets. Adding the CI step does not require adding new GitHub Actions secrets.
- **`astro sync` is the dependency**: tests depend on `.astro/types.ts` for Astro module types. That step already runs before lint, so tests are unblocked regardless of whether they run before or after `npm run build`.

---

## Historical Context

- `context/archive/2026-06-08-reaction-api-integrity/plan.md` — Phase 1 established the `vi.mock("astro:env/server", ...)` pattern as a project-wide contract. Decision: separate file for missing-key tests because `vi.mock` is hoisted file-wide.
- `context/archive/2026-06-12-testing-streaming-context/plan.md` — Phase 2 added the streaming component test (`NpcReaction.test.tsx`) and the `reaction.context.test.ts` integration. All use the same mock contract.
- `context/foundation/test-plan.md:76–80` — §3 Phase 3 row defines this change's goal: "Add `npm run test` to the CI workflow so no regression can ship without tests running."

---

## Related Research

- `context/archive/2026-06-08-reaction-api-integrity/research.md` — env var mocking strategy for Vitest + Astro
- `context/archive/2026-06-12-testing-streaming-context/research.md` — streaming test setup and jsdom env pattern

---

## Open Questions

1. **Placement**: before or after `npm run build`? Both work technically. The test-plan §6.4 annotation says after build, but before build is equally valid and fails faster. This is the one decision the plan must resolve.
