---
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
---

## Why this stack

The 10x Astro Starter pairs Astro 6 + React 19 + TypeScript + Supabase + Cloudflare Pages into one opinionated full-stack package that covers every hard requirement NPC Manager's PRD names: email/password authentication (FR-001, FR-002) via Supabase Auth, a PostgreSQL database for campaigns, NPCs, and relationships (FR-003 through FR-009), and Astro API routes from which the AI reaction feature (FR-010) calls the Anthropic SDK with streaming — satisfying the 2-second visible-feedback NFR at the edge. Supabase Row Level Security enforces the per-user data-isolation guardrail from day one, with no extra plumbing. The edge runtime handles low-traffic solo GM sessions without idle costs, and Cloudflare Pages auto-deploys on merge via GitHub Actions, keeping the after-hours 3-week timeline on track. The starter passes all four agent-friendly quality gates — typed (TypeScript throughout), convention-based (Astro file-based routing), popular in training data, and well-documented — making it a low-friction target for AI-assisted development.
