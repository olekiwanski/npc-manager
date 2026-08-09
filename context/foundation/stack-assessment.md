---
project: "10x-astro-starter (NPC Manager)"
assessed_at: 2026-08-08T15:36:31Z
agent_readiness: ready
context_type: brownfield
stack_components:
  language: TypeScript
  framework: Astro 6 (SSR) + React 19 islands
  build_tool: Astro build (Vite-based)
  test_runner: Vitest (unit) + Playwright (E2E)
  package_manager: npm
  ci_provider: GitHub Actions
  deployment_target: Cloudflare Workers
gates_passed: 4
gates_failed: 0
---

## Stack Components

**Language — TypeScript.** `tsconfig.json` extends `astro/tsconfigs/strict`, and the path alias `@/*` → `./src/*` is configured. TypeScript is used end-to-end: Astro pages, React components, API routes, and `src/types.ts` for shared entity/DTO types.

**Framework — Astro 6 (SSR) + React 19 islands.** Astro handles routing (`src/pages/`, file-based, including `src/pages/api/`) and layout; React is used selectively for interactive islands (`src/components/`). Deployed as a Cloudflare Worker via the `@astrojs/cloudflare` adapter.

**Build tool — Astro build, Vite-based.** Astro's own build pipeline wraps Vite (visible via the `@tailwindcss/vite` plugin and the `vite` override in `package.json`). Tailwind 4 is integrated at the Vite layer.

**Test runner — Vitest (unit) + Playwright (E2E).** `vitest.config.ts` and `playwright.config.ts` are both present at the project root; `npm run test` / `npm run test:coverage` cover unit tests, `npm run test:e2e` covers browser-level tests.

**Supporting components (not scored against the four gates, noted for completeness):** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for Postgres + Auth with row-level data isolation; Zod for schema validation at API boundaries (already the established pattern in `src/pages/api/npcs/*.ts`); `@anthropic-ai/sdk` for the AI in-character reaction feature; ESLint (flat config, typed rules via `typescript-eslint`) + Prettier + Husky/lint-staged for code quality gates.

## Quality Gate Assessment

| Component  | Typed | Convention | Training Data | Documented | Verdict |
|------------|-------|------------|----------------|------------|---------|
| Language (TypeScript) | ✓ | — | — | — | pass |
| Framework (Astro 6 + React 19) | — | ✓ | ✓ | ✓ | pass |
| Build tool (Astro build / Vite) | — | ✓ | ✓ | ✓ | pass |
| Test runner (Vitest + Playwright) | — | — | ✓ | ✓ | pass |

Legend: ✓ = pass, ✗ = fail, ~ = partial, — = not applicable

### Gate Details

**Typed — pass.** `tsconfig.json` declares `"extends": "astro/tsconfigs/strict"`, the strictest of Astro's built-in TS presets. Component props, API route handlers, and shared entities (`src/types.ts`) are all explicitly typed; API request bodies are validated against Zod schemas at the boundary (e.g. `src/pages/api/npcs/index.ts`), giving the agent a runtime-checked contract to reason from, not just compile-time types.

**Convention-based — pass (framework and build tool).** Astro ships file-based routing (`src/pages/` → routes, `src/pages/api/` → API endpoints) and a documented island-architecture split between static Astro components and interactive React islands (`src/components/ui/` for shadcn/ui, `src/components/hooks/` for React hooks) — this exact structure is also documented in `AGENTS.md`, reinforcing the framework's own conventions rather than replacing them.

**Popular in training data — pass.** React is a top-tier framework in the JS/TS training corpus (explicitly listed as a passing example in the underlying criteria). Astro, while smaller than Next.js, is a mainstream, actively-discussed framework within the JS/TS ecosystem with strong idiom coverage. Vite and Vitest are both extremely well-represented in JS/TS training data; Playwright is the dominant E2E tool in the same ecosystem.

**Well-documented — pass.** Astro (`docs.astro.build`), React (`react.dev`), Vite, Vitest, and Playwright all maintain current, versioned official documentation with examples that track their current APIs.

## Gaps & Compensation

None. All four components scored pass on all applicable gates — no compensation strategies are needed for this stack.

One observation worth carrying into implementation rather than a genuine gap: `AGENTS.md` already documents the project's conventions explicitly (hard rules, project structure, auth flow, testing) — this is itself a form of the "convention-based" gate being reinforced at the instruction-file layer, on top of Astro's own opinions. The WFRP4e stats change (per `context/foundation/prd-v2.md`) should extend this same pattern: any new conventions specific to the stats feature (e.g. how derived-stat calculation is structured, where the creature catalog reference data lives) are worth adding to `AGENTS.md` once implementation choices are made, so the pattern that already makes this stack agent-friendly keeps holding as the codebase grows.

### Recommended Instruction File Additions

None required. The existing `AGENTS.md` / `CLAUDE.md` pair already documents hard rules, structure, and conventions consistent with what an agent needs for this stack.

## Summary

**Overall verdict: ready.** Every scored component (TypeScript, Astro 6 + React 19, the Vite-based build tool, and the Vitest/Playwright test runners) passes all applicable agent-friendly criteria — typed contracts throughout, strong framework conventions reinforced by an explicit `AGENTS.md`, mainstream standing in the JS/TS training corpus, and current versioned documentation for every piece.

**Key strength for the upcoming change:** the existing Zod-at-the-API-boundary pattern (already used for `npcs` CRUD) is a direct, ready-to-reuse template for the new WFRP4e stat endpoints — the stack doesn't need new validation infrastructure, just more schemas following the same shape.

**Key gap:** none at the stack level. Any friction in the WFRP4e stats change will come from domain complexity (the size of the Bestiary catalog, the derived-stat calculation rules) rather than from the underlying stack.

**Recommended next step:** `/10x-health-check` — audits dependency health, test coverage, and CI/CD readiness ahead of implementation.
