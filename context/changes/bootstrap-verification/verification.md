---
bootstrapped_at: 2026-05-19T16:18:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: npc-manager
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: npc-manager
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

### Why this stack

The 10x Astro Starter pairs Astro 6 + React 19 + TypeScript + Supabase + Cloudflare Pages into one opinionated full-stack package that covers every hard requirement NPC Manager's PRD names: email/password authentication (FR-001, FR-002) via Supabase Auth, a PostgreSQL database for campaigns, NPCs, and relationships (FR-003 through FR-009), and Astro API routes from which the AI reaction feature (FR-010) calls the Anthropic SDK with streaming — satisfying the 2-second visible-feedback NFR at the edge. Supabase Row Level Security enforces the per-user data-isolation guardrail from day one, with no extra plumbing. The edge runtime handles low-traffic solo GM sessions without idle costs, and Cloudflare Pages auto-deploys on merge via GitHub Actions, keeping the after-hours 3-week timeline on track. The starter passes all four agent-friendly quality gates — typed (TypeScript throughout), convention-based (Astro file-based routing), popular in training data, and well-documented — making it a low-friction target for AI-assisted development.

## Pre-scaffold verification

| Signal      | Value                                             | Severity | Notes                                        |
| ----------- | ------------------------------------------------- | -------- | -------------------------------------------- |
| npm package | not run                                           | n/a      | cmd_template starts with git clone; npm check skipped |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17 | fresh | from card.docs_url; 2 days ago |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone (clone the starter repo, strip upstream git history, move files up)
**Exit code**: 0
**Files moved**: 20 items (7 directories + 13 files)
**Conflicts (.scaffold siblings)**: `CLAUDE.md.scaffold` (cwd CLAUDE.md wins; scaffold copy sidelined)
**.gitignore handling**: moved silently (absent in cwd before scaffold)
**.bootstrap-scaffold cleanup**: deleted

### Files moved

Directories: `.github`, `.husky`, `.vscode`, `node_modules`, `public`, `src`, `supabase`

Files: `.env.example`, `.gitignore`, `.nvmrc`, `.prettierrc.json`, `astro.config.mjs`, `CLAUDE.md.scaffold`, `components.json`, `eslint.config.js`, `package-lock.json`, `package.json`, `README.md`, `tsconfig.json`, `wrangler.jsonc`

Preserved in cwd: `.claude/`, `.idea/`, `context/` (bootstrap chain source of truth — never overwritten), `ideas/`, `CLAUDE.md` (existing wins)

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 10 MODERATE, 0 LOW
**Direct vs transitive**: Direct — 0 HIGH, 3 MODERATE; Transitive — 1 HIGH, 7 MODERATE

#### CRITICAL findings

None.

#### HIGH findings

| Package  | Version     | Advisory                           | CVSS | Direct? | Fix available |
| -------- | ----------- | ---------------------------------- | ---- | ------- | ------------- |
| devalue  | 5.6.3–5.8.0 | GHSA-77vg-94rm-hx3p — DoS via sparse array deserialization | 7.5 | No (transitive) | Yes (`npm audit fix`) |

**Details**: `devalue` is consumed transitively. A fix is available via `npm audit fix`. This is a DevTools/build-time dependency; the DoS surface is in deserialization of untrusted sparse arrays.

#### MODERATE findings

| Package                 | Version          | Advisory / via                                         | Direct? |
| ----------------------- | ---------------- | ------------------------------------------------------ | ------- |
| `@astrojs/check`        | >=0.9.3          | via `@astrojs/language-server`                         | Yes     |
| `@astrojs/cloudflare`   | >=12.2.4         | via `@cloudflare/vite-plugin`, `wrangler`              | Yes     |
| `@astrojs/language-server` | >=2.14.0      | via `volar-service-yaml`                               | No      |
| `@cloudflare/vite-plugin` | various        | via `miniflare`, `wrangler`, `ws`                      | No      |
| `miniflare`             | various          | via `ws`                                               | No      |
| `volar-service-yaml`    | <=0.0.70         | via `yaml-language-server`                             | No      |
| `wrangler`              | various          | via `miniflare`                                        | Yes     |
| `ws`                    | 8.0.0–8.20.0    | GHSA-58qx-3vcg-4xpx — Uninitialized memory disclosure (CVSS 4.4) | No |
| `yaml`                  | 2.0.0–2.8.2     | GHSA-48c2-rrv3-qjmp — Stack overflow via deeply nested YAML (CVSS 4.3) | No |
| `yaml-language-server`  | various          | via `yaml`                                             | No      |

Most MODERATE findings are in dev/toolchain dependencies (`wrangler`, `@astrojs/check`, `@astrojs/cloudflare`) and are not on the runtime request path. `npm audit fix --force` addresses them but requires semver-major bumps — review the changelog first.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value              |
| ----------------------- | ------------------ |
| bootstrapper_confidence | first-class        |
| quality_override        | false              |
| path_taken              | standard           |
| self_check_answers      | null               |
| team_size               | solo               |
| deployment_target       | cloudflare-pages   |
| ci_provider             | github-actions     |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true               |
| has_payments            | false              |
| has_realtime            | false              |
| has_ai                  | true               |
| has_background_jobs     | false              |

All hints above were read and logged. None triggered automated action in v1. Feature flags (`has_auth`, `has_ai`) and deployment/CI hints are preserved here for a future M1L4 skill that will act on them when generating agent context (`CLAUDE.md`, `AGENTS.md`).

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review `CLAUDE.md.scaffold` — diff it against the existing `CLAUDE.md` to see what the starter ships vs what you had, and merge anything useful.
- `npm audit fix` to address the HIGH finding (devalue DoS, CVSS 7.5 — fix available without breaking changes). For the MODERATE chain through wrangler/cloudflare, run `npm audit fix --force` only after reviewing the changelogs (major-version bumps involved).
- Configure Supabase: update `.env.example` → `.env` with your project URL and anon key.
- Configure Cloudflare Pages: link the repo in the Cloudflare dashboard and set `wrangler.jsonc` to your account/project details.
