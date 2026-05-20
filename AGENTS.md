# Repository Guidelines

NPC Manager is an Astro 6 SSR web app for RPG game masters, built with React 19 islands, Tailwind 4, and Supabase auth, deployed to Cloudflare Workers.

## Hard Rules

- Use `cn()` from `@/lib/utils` for Tailwind class merging — never concatenate class strings manually.
- No Next.js directives (`"use client"`) in React components.
- API route files must export `const prerender = false`; handlers use uppercase named exports (`GET`, `POST`) with zod validation.
- New Supabase tables must have RLS enabled with per-operation, per-role policies.
- `SUPABASE_URL` and `SUPABASE_KEY` are server-only (`astro:env/server`) — never reference them in client-side code or Astro frontmatter returned to the client.

## Project Structure

`src/components/` — Astro + React components; `ui/` for shadcn/ui, `hooks/` for React hooks. `src/lib/` — utilities and services. `src/pages/` — routes: Astro pages, `api/`, `auth/`. `src/middleware.ts` — resolves authenticated user to `context.locals.user`. `src/types.ts` — shared entity and DTO types. `supabase/migrations/` — files named `YYYYMMDDHHmmss_short_description.sql`.

Path alias `@/*` → `./src/*` (see `@tsconfig.json`).

## Auth Flow

- `src/lib/supabase.ts` — SSR client (`@supabase/ssr`), cookie-based sessions; reads `SUPABASE_URL`/`SUPABASE_KEY` via `astro:env/server`.
- `src/middleware.ts` — runs on every request; resolves user to `context.locals.user`; redirects unauthenticated users away from paths in `PROTECTED_ROUTES`.
- `src/pages/api/auth/{signin,signup,signout}.ts` — auth API endpoints.
- `src/pages/auth/{signin,signup,confirm-email}.astro` — auth UI pages.
- To protect a new route, add its path to the `PROTECTED_ROUTES` array in `src/middleware.ts`.

## Commands

See @README.md for the full script list. Test-specific commands not in README:

- `npm run test` — Vitest single run
- `npm run test:coverage` — v8 coverage report (text + html)

## Conventions

Use Astro components for layout and static content; React only when client interactivity is required. Install shadcn/ui components with `npx shadcn@latest add [name]` ("new-york" style); they land in `src/components/ui/`. React hooks belong in `src/components/hooks/`. Shared types in `src/types.ts`; services/helpers in `src/lib/`. Pre-commit hooks (husky + lint-staged) auto-fix lint and format — do not bypass them.

## Testing

Vitest with Node environment; test files co-located with source as `*.test.ts`. Run a single file: `vitest run src/lib/utils.test.ts`. No coverage threshold enforced. Tests are not in the CI gate — run locally before pushing.

## Commits & CI

Imperative style: `Add …`, `Fix …`, `Update …`. No conventional-commit prefix required. CI (`@.github/workflows/ci.yml`) runs lint + build on push/PR to `master`; tests do not run in CI.

## Secrets & Environment

See @README.md (Supabase Configuration + CI sections) for local dev setup and repository secrets configuration.
