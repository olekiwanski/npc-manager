# Promptfoo Eval Suite for `@packages/code-reviewer` — Plan Brief

> Full plan: `context/changes/code-review-evals/plan.md`
> Research: `context/changes/code-review-evals/research.md`

## What & Why

Introduce promptfoo into `packages/code-reviewer` to compare how three Anthropic models (haiku-4-5, sonnet-4-6, opus-4-8) perform on the same code-review task. The goal is to make model quality and cost differences visible through a structured, repeatable eval run — a foundational skill for working with AI in production.

## Starting Point

The package already has a working `reviewDiff()` agent and a typed `SYSTEM_PROMPT` + `REVIEW_JSON_SCHEMA`. The only blocker is that `model` is hardcoded in `reviewer.ts:17`; the native promptfoo provider bypasses `reviewDiff()` entirely, so this is a quick cleanup rather than a hard dependency.

## Desired End State

`npm run eval` in `packages/code-reviewer` runs all three models against one migration diff, prints a terminal comparison table with scores and verdict per model, and exits non-zero if any assertion fails. A `workflow_dispatch` GitHub Actions workflow makes the same run triggerable from the GitHub UI.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Eval toolkit | promptfoo | Native `anthropic:claude-agent-sdk` provider avoids custom wrapper code | Research |
| Provider path | Native SDK provider (no custom `.ts`) | The only variable is model — native provider handles that cleanly | Research |
| Models | haiku-4-5 + sonnet-4-6 + opus-4-8 | Full quality spectrum; most educational at ~$0.15/run for 1 diff | Plan |
| Judge model | haiku-4-5 | Cheapest model capable of rubric evaluation | Plan |
| Test fixture | 1 complex Supabase migration diff | Matches project tech stack; 3 embedded bugs give unambiguous ground truth | Plan |
| Static assertion | `verdict === 'fail'` javascript check | Human-labelled ground truth → free deterministic check, no LLM cost | Research |
| LLM judge scope | Names ≥2 of 3 specific bugs | Checks semantic correctness of the review, not just verdict | Plan |
| CI trigger | `workflow_dispatch` only | Prevents accidental runs; budget stays predictable | Research |

## Scope

**In scope:**
- `model` param added to `reviewDiff()` (housekeeping)
- `promptfoo` installed as devDep + two npm scripts (`eval`, `eval:view`)
- `evals/diffs/complex-migration.diff` — 55-line Supabase migration with 3 bugs
- `evals/promptfooconfig.yaml` — 3 providers, inlined schema, 4 assertions
- `.github/workflows/evals.yml` — `workflow_dispatch` CI job

**Out of scope:**
- Custom TypeScript provider
- Multiple diff fixtures
- Automatic PR trigger
- Changes to `SYSTEM_PROMPT` or `REVIEW_SCHEMA`
- promptfoo cloud sharing

## Architecture / Approach

promptfoo drives three instances of the native `anthropic:claude-agent-sdk` provider in parallel, each configured with the same `system` prompt and `outputFormat` schema but a different `model`. The diff is passed as the user message via `{{diff}}` templating. Assertions run after each model responds: two free JavaScript checks (structure + static verdict) and one `llm-rubric` assertion judged by a separate haiku-4-5 call that checks whether the review names the embedded bugs.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Prepare the package | `model` param on `reviewDiff()`, promptfoo installed, npm scripts wired | Minor — 2 file edits |
| 2. Build eval suite | Diff fixture + promptfooconfig.yaml; `npm run eval` passes all assertions | YAML anchor syntax rejected by promptfoo's parser; fall back to repeated config blocks |
| 3. Wire CI workflow | `workflow_dispatch` job; runnable from GitHub Actions UI | `ANTHROPIC_API_KEY` secret must be added manually before first trigger |

**Prerequisites:** Node 22, `ANTHROPIC_API_KEY` env var for local runs; same key as a GitHub repo secret for CI
**Estimated effort:** ~1 session across 3 phases

## Open Risks & Assumptions

- YAML merge keys (`<<: *anchor`) are assumed to be supported by promptfoo's YAML parser; if not, repeat each provider's config block explicitly
- `maxBudgetUsd: 0.20` on opus-4-8 is estimated — increase to `0.30` if the agent aborts before completing the review
- ~~`ANTHROPIC_API_KEY` secret missing~~ — already configured as a repository secret ✓

## Success Criteria (Summary)

- `npm run eval` exits 0 with a 3-column comparison table showing haiku / sonnet / opus scores side-by-side
- The LLM judge passes for at least one model (confirms the review correctly identified the migration bugs)
- The GitHub Actions "Run workflow" button triggers a successful eval run
