First Production Deploy — NPC Manager → Cloudflare Workers

     Context

     infrastructure.md selected Cloudflare Workers as the deployment target (5/5 score). The project is already scaffolded with @astrojs/cloudflare v13 and wrangler.jsonc correctly configured — no adapter migration is needed. Two pre-deploy fixes are required before the first wrangler deploy can succeed:

     1. tech-stack.md says deployment_target: cloudflare-pages — wrong platform; @astrojs/cloudflare v13 no longer supports Pages SSR.
     2. astro.config.mjs calls cloudflare() with no imageService option; the default ('cloudflare-binding') will fail at runtime if any component uses <Image /> without the binding configured.

     The risk register rates both items High likelihood / High impact — they must be fixed before deploy.

     ---
     Step-by-Step Plan

     Step 1 — Agent: Fix tech-stack.md (contract correction)

     File: context/foundation/tech-stack.md line 8

     Change:
       deployment_target: cloudflare-pages
     To:
       deployment_target: cloudflare-workers

     Also update the body text in the same file — the sentence "Cloudflare Pages auto-deploys on merge via GitHub Actions" should be changed to reference Cloudflare Workers (via Wrangler GitHub Action).

     Step 2 — Agent: Fix astro.config.mjs (image service)

     File: astro.config.mjs line 16

     Change:
     adapter: cloudflare(),
     To:
     adapter: cloudflare({ imageService: 'compile' }),

     This prevents a silent runtime failure if <Image /> is used in any component.

     Step 3 — Manual gate: Wrangler login

     The user must run this in their terminal (browser OAuth flow — cannot be automated):

     npx wrangler login
     npx wrangler whoami   # confirm identity

     Agent waits here until the user confirms login is done.

     Step 4 — Manual gate: Set production secrets

     The user must set secrets interactively (values must not appear in conversation or files):

     echo "https://<project-ref>.supabase.co" | npx wrangler secret put SUPABASE_URL
     echo "<anon-key>" | npx wrangler secret put SUPABASE_KEY

     Secrets are encrypted at rest; they are never visible in the Cloudflare dashboard. The user must have their Supabase project URL and anon key ready.

     Agent waits here until the user confirms secrets are set.

     Step 5 — Agent: Build

     npm run build

     Expected outcome: dist/ directory populated, no TypeScript or build errors.

     Step 6 — Agent: Dry-run deploy (bundle size check)

     npx wrangler deploy --dry-run

     This catches bundle-size limit violations (3 MB gzip on free, 10 MB on paid) before uploading. If this fails with a size error, the deploy cannot proceed until the bundle is reduced.

     Step 7 — Agent: Production deploy

     npx wrangler deploy

     Expected outcome: Wrangler prints a Worker URL (https://npc-manager.<account>.workers.dev).

     Step 8 — Agent: Verify live deployment

     npx wrangler tail npc-manager --format json --status error

     Open the printed Worker URL in a browser and confirm the app loads. Tail should show no errors.

     ---
     Files Modified

     ┌──────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
     │               File               │                                   Change                                   │
     ├──────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
     │ context/foundation/tech-stack.md │ deployment_target: cloudflare-pages → cloudflare-workers; update body text │
     ├──────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
     │ astro.config.mjs                 │ cloudflare() → cloudflare({ imageService: 'compile' })                     │
     └──────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘

     wrangler.jsonc is already correct — no changes needed.

     ---
     Manual Gates Summary

     ┌────────────────┬──────┬───────────────────────────────────────────────────────┐
     │      Gate      │ Who  │                         What                          │
     ├────────────────┼──────┼───────────────────────────────────────────────────────┤
     │ Wrangler login │ User │ npx wrangler login in terminal                        │
     ├────────────────┼──────┼───────────────────────────────────────────────────────┤
     │ Set secrets    │ User │ wrangler secret put for SUPABASE_URL and SUPABASE_KEY │
     └────────────────┴──────┴───────────────────────────────────────────────────────┘

     Destructive actions (deleting the Worker, modifying DNS, rotating Cloudflare API token) are panel-only and NOT part of this plan.
