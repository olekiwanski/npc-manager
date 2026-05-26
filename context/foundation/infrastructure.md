---
project: npc-manager
researched_at: 2026-05-26
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd)
  database: Supabase Auth + PostgreSQL (external)
---

## Recommendation

**Deploy on Cloudflare Workers.**

The project is already scaffolded for this platform: `@astrojs/cloudflare` v13.5.2 is installed, `wrangler.jsonc` is correctly configured with `nodejs_compat`, and `wrangler` v4.93.0 is a dev dependency — first deploy requires zero adapter migration. Against the five agent-friendly criteria the platform scores 5/5 (the only candidate to do so), and the interview confirmed cost-minimization priority ($5/month paid plan, or free below 100k requests/day) plus existing Cloudflare familiarity. The only meaningful correction required before deploying is updating `tech-stack.md` — which says `deployment_target: cloudflare-pages`, a platform that `@astrojs/cloudflare` v13 no longer supports for SSR.

## Platform Comparison

Scored against the five agent-friendly criteria (Pass / Partial / Fail). Hard filter applied: all non-Cloudflare platforms require replacing `@astrojs/cloudflare` with a Node.js adapter — a non-trivial migration on a 3-week timeline. Soft weights applied: cost-minimization (Q2), Cloudflare familiarity as tie-breaker (Q3), single-region target (Q4), co-location with Supabase as external provider acceptable (Q5).

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Score |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | **5/5** |
| **Vercel** | Pass | Pass | Pass | Pass | Partial (MCP beta) | **4.5/5** |
| **Netlify** | Partial (no CLI rollback) | Pass | Pass | Partial (no CLI rollback) | Pass | **4/5** |
| **Render** | Partial (no CLI rollback) | Partial (owned instance) | Pass | Partial (no CLI rollback) | Pass | **3.5/5** |
| **Fly.io** | Pass | Partial (Dockerfile) | Partial (no llms.txt) | Pass | Partial (MCP experimental) | **3.5/5** |
| **Railway** | Partial (no CLI rollback) | Partial (persistent proc) | Pass | Partial (no CLI rollback) | Partial (MCP WIP) | **3/5** |

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

The adapter, runtime config, and CLI are already in place — no migration work. Workers scores the maximum 5/5: `wrangler` covers every operational task from the CLI (deploy, rollback, log-tail), the platform is fully serverless with zero infrastructure to manage, docs are markdown-sourced on GitHub with a published `llms.txt`, `wrangler deploy` is deterministic with structured exit codes, and Cloudflare operates 16+ first-party MCP servers (GA). At 10k–100k monthly requests the effective cost is $5/month (paid plan required for SSR above ~15ms CPU/request; free tier's 10ms CPU cap is too tight for React 19 SSR under real load). Static asset requests are free and unlimited on all plans.

#### 2. Vercel

Strong 4.5/5 with a mature `vercel` CLI, `llms-full.txt` (full docs as markdown), and deterministic rollback via `vercel rollback`. The `@astrojs/vercel` adapter is GA and Supabase is a first-class Vercel Marketplace integration. The gaps: Vercel MCP is still in beta (launched Aug 2025), the Hobby plan is non-commercial only (any revenue use requires Pro at $20/dev/month), and there's an active Astro 6 esbuild parse error on some SSR component chunks (issue #16258, not a blocker but needs monitoring). Requires adapter swap.

#### 3. Netlify

Solid 4/5 with a GA Astro 6 compatibility statement (March 10, 2026), a first-class Supabase extension that auto-injects env vars, and an MCP server in production since February 2025. The gaps: no CLI rollback command (dashboard only), the new credit-based free tier caps production deploys at ~20/month on 300 credits, and — like all non-Cloudflare options — it requires an adapter swap plus a `process.env` vs `import.meta.env` runtime variable discipline change. The 60-second function timeout is not a constraint for this app.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **The free tier 10ms CPU cap makes SSR effectively paid from day one.** React 19 SSR rendering for non-trivial Astro pages exceeds 10ms of CPU time per request. The 100k requests/day allowance is generous, but CPU is the binding constraint — SSR routes will 429 on free under real traffic. The $5/month paid plan is the de facto minimum, not a true free option.

2. **`tech-stack.md` states `deployment_target: cloudflare-pages` — which is wrong.** `@astrojs/cloudflare` v13 dropped Pages support for SSR. An agent reading `tech-stack.md` before deploying will attempt a Pages deploy and fail. This must be corrected before any automated deploy workflow is set up.

3. **Astro 6 changed the default `imageService` to `'cloudflare-binding'`.** If any component uses `<Image />`, it will fail at runtime in production (missing binding) while working fine in local dev (mock binding). The `astro.config.mjs` calls `cloudflare()` with no options — the imageService default must be audited before first deploy.

4. **Worker script bundle size limit is 3MB gzip on free, 10MB on paid.** An Astro 6 + React 19 SSR bundle can approach this. The limit is a hard upload error, not a runtime error — test with `npx wrangler deploy --dry-run` before committing to the first production deploy.

5. **Preview deploys for PRs are not automatic.** Vercel and Netlify auto-generate branch preview URLs. Cloudflare Workers requires explicit GitHub Actions config (Wrangler action + branch-named Worker scripts) for per-PR preview environments — not zero-effort on an agent-driven workflow.

### Pre-Mortem — How This Could Fail

Six months in, three compounding failures hit the NPC Manager timeline. First, the 10ms CPU cap on the (mistakenly kept) free plan returned 429 errors on every SSR route under any real traffic. The error appeared as `error code: 1042` in the response body — not surfaced by Wrangler's CLI output — and went undetected for two days until a user reported blank pages. The $5/month upgrade fixed it immediately, but the two-day blind spot cost a full sprint. Second, the Astro 6 `imageService: 'cloudflare-binding'` default broke every page containing an `<Image />` component in production while local dev showed nothing wrong (the mock binding silently succeeded). Tracing it took a day: the fix was one line in `astro.config.mjs`. Third, when the AI reaction feature was wired up with the Anthropic SDK streaming response, the per-request streaming open time interacted with Workers' CPU time accounting in unexpected ways under concurrent load — not a blocker, but it required profiling that consumed the buffer intended for the relationship graph feature. Together these three issues — all foreseeable — consumed the remaining scope margin and the nice-to-have graph (FR-011) was cut from MVP.

### Unknown Unknowns

1. **`tech-stack.md` must be corrected to `cloudflare-workers` before any agent-driven deploy.** The current value (`cloudflare-pages`) is a stale contract that will cause automated deploy attempts to target the wrong platform.

2. **`@supabase/ssr` requires Node.js crypto APIs — covered by `nodejs_compat` but fragile if new transitive deps appear.** Always smoke-test auth flows using `npm run dev` (which now runs `workerd` via Vite Environment API in Astro 6), not just unit tests in the Node.js environment, before each deploy.

3. **CPU time (not wall-clock) is what the billing and limits meter.** The Anthropic SDK streaming call for FR-010 awaits a network response — that wait does NOT count against the 30s CPU limit. But token-by-token SSE forwarding and React SSR computation do. Short SSR pages are safe; any server-side computation-heavy route (e.g., building a graph payload for FR-011) may need profiling.

4. **Cloudflare D1 is SQLite, not PostgreSQL.** If the project ever migrates away from Supabase to a co-located D1 database, PostgreSQL-specific SQL syntax and Supabase RLS policies have no direct D1 equivalent — plan the migration carefully rather than assuming a drop-in swap.

## Operational Story

- **Preview deploys**: No automatic branch preview URLs. Manual setup via `wrangler deploy --name npc-manager-preview` targeting a separate Worker script name, or use the [Cloudflare Workers GitHub Action](https://github.com/cloudflare/wrangler-action) with branch-conditional naming. Preview Workers can be protected with Cloudflare Access (zero-trust, free tier included).
- **Secrets**: `SUPABASE_URL` and `SUPABASE_KEY` are stored as Workers Secrets, not in `wrangler.jsonc`. Set via `npx wrangler secret put SUPABASE_URL` (prompts for value) or `echo "value" | npx wrangler secret put SUPABASE_URL`. Secrets are encrypted at rest, readable only at runtime — not accessible in the Cloudflare dashboard. Rotation: `wrangler secret put` with the new value overwrites the old one instantly.
- **Rollback**: `npx wrangler rollback` reverts to the previous deployment version immediately (no rebuild). To target a specific version: `npx wrangler rollback <version-id>`. Time-to-revert: seconds. Caveat: database migrations (Supabase) do not roll back automatically — coordinate schema changes with code deploys.
- **Approval**: Destructive actions (deleting a Worker, rotating a Cloudflare API token, modifying DNS, dropping a Supabase table) are human-only panel operations. An agent may perform `wrangler deploy`, `wrangler rollback`, and `wrangler secret put` unattended. `wrangler tail` is always safe (read-only).
- **Logs**: `npx wrangler tail npc-manager` streams live runtime logs. Flags: `--format json` for structured output, `--status error` to filter failures, `--search "term"` for content filtering. Build logs appear inline during `wrangler deploy`.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free tier CPU cap (10ms) blocks SSR under any real traffic | Devil's advocate | H | H | Use the $5/month Workers Paid plan from day one; do not rely on free tier for SSR routes |
| `tech-stack.md` says `cloudflare-pages` — agents will target wrong platform | Unknown unknowns | H | H | Correct `deployment_target` to `cloudflare-workers` in `tech-stack.md` as the first deploy step |
| `imageService: 'cloudflare-binding'` default fails if `<Image />` is used without the binding | Devil's advocate | M | H | Add `imageService: 'compile'` to `cloudflare()` options in `astro.config.mjs`, or configure the Cloudflare Images binding before first deploy |
| Worker bundle exceeds 3MB gzip (free) or 10MB (paid) on first build | Devil's advocate | M | M | Run `npx wrangler deploy --dry-run` before first production deploy to catch size errors |
| No auto-preview URLs for PR review | Devil's advocate | M | L | Configure Wrangler GitHub Action with branch-conditional Worker naming early; or accept manual preview deploys at MVP scale |
| `@supabase/ssr` transitive dep uses unsupported Node.js API in workerd | Unknown unknowns | L | M | Test auth flow with `npm run dev` (workerd-backed since Astro 6 + adapter v13) before every deploy |
| Streaming AI response (FR-010) unexpectedly counted against CPU limit | Pre-mortem | L | M | Profile with `wrangler tail --format json` in staging; Anthropic SDK await time is free, SSE forwarding is not |
| D1 SQLite dialect divergence if DB ever migrated from Supabase | Unknown unknowns | L | L | Stay on Supabase; document D1 as a future option with an explicit migration plan, not a drop-in swap |

## Getting Started

The project is already scaffolded — no adapter migration needed. Perform these steps in order:

1. **Correct `context/foundation/tech-stack.md`**: change `deployment_target: cloudflare-pages` to `cloudflare-workers`. The `@astrojs/cloudflare` v13 adapter exclusively targets Workers; Pages SSR is no longer supported.

2. **Fix the `imageService` default** in `astro.config.mjs`. Add `imageService: 'compile'` to the adapter call unless a Cloudflare Images binding is configured:
   ```js
   adapter: cloudflare({ imageService: 'compile' })
   ```

3. **Log in and verify the Worker name**: `npx wrangler login` (browser OAuth), then `npx wrangler whoami` to confirm identity. The `wrangler.jsonc` already names the Worker `npc-manager`.

4. **Set production secrets** (do not commit these to `.dev.vars` or any file):
   ```bash
   echo "https://your-project.supabase.co" | npx wrangler secret put SUPABASE_URL
   echo "your-anon-key" | npx wrangler secret put SUPABASE_KEY
   ```

5. **Build, dry-run, and deploy**:
   ```bash
   npm run build
   npx wrangler deploy --dry-run   # catches bundle size issues before upload
   npx wrangler deploy             # production deploy; prints the Worker URL
   ```

6. **Verify the live deployment** by tailing logs in one terminal and hitting the app URL in another:
   ```bash
   npx wrangler tail npc-manager --format json
   ```

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (GitHub Actions wrangler deploy workflow)
- Production-scale architecture (multi-region, HA, DR)
