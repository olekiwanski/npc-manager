# CI/CD Code Review Workflow — Plan Brief

> Full plan: `context/changes/ci-cd-code-review/plan.md`
> Research: `context/changes/ci-cd-code-review/research.md`

## What & Why

Wire the existing `packages/code-reviewer` Claude Agent SDK reviewer into GitHub Actions so every
PR to master gets an automated code review. The reviewer is already CI-ready (stdin diff → JSON
stdout); this change adds the GHA plumbing to call it, post a scored comment, and manage labels.

## Starting Point

`packages/code-reviewer` is a standalone CLI agent that reads a git diff from stdin and outputs
a JSON verdict with five 1–10 scores and a markdown summary. GitHub Actions is already configured
(`ci.yml`), `ANTHROPIC_API_KEY` is in repo secrets, and Node 22 is the standard runtime.
No composite actions exist yet.

## Desired End State

Every PR to master gets a review comment with a score table and verdict label (`ai-cr:passed` or
`ai-cr:failed`) within ~2 minutes of opening or pushing. Developers can re-trigger by adding the
`ai-cr:review` label. The workflow is advisory — it never blocks merge.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| PR body in prompt | Yes, via `env:` | Gives agent intent context; injection-safe via env var | Plan |
| Merge gate | Advisory (exit 0 always) | Hotfixes and urgent PRs must not be blocked by AI | Plan |
| Agent error handling | Soft — warning comment | Infrastructure failures shouldn't block all PRs | Plan |
| PR trigger events | opened + synchronize | Review stays current after each push | Plan |
| Diff filtering | Yes — exclude lockfiles/dist | Reduces tokens; agent focuses on real code changes | Plan |
| Architecture | 2-layer: workflow + composite action | Composite action is reusable; workflow stays readable | Requirements |
| npm install scope | `npm ci --prefix=packages/code-reviewer` | Root is not a workspaces monorepo | Research |

## Scope

**In scope:**
- `packages/code-reviewer`: extend `reviewDiff()` with optional `prTitle`/`prBody` params
- `.github/actions/ai-review/action.yml` — composite action (install, diff, agent, comment, labels)
- `.github/workflows/review.yml` — orchestrator workflow

**Out of scope:**
- Merge gate / branch protection configuration
- `10x-impl-review-ci` skill integration
- Modifications to existing `ci.yml`
- PR body truncation (cost cap is `maxBudgetUsd: 0.1` in the agent)

## Architecture / Approach

```
review.yml (trigger: opened | synchronize | labeled)
  └── checkout (fetch-depth: 0)
  └── gh label create --force (3 labels, idempotent)
  └── .github/actions/ai-review/
        └── npm ci --prefix=packages/code-reviewer
        └── git diff origin/<base>...HEAD (exclude lockfiles) → /tmp/pr.diff
        └── [guard: empty diff → neutral comment, exit 0]
        └── npm run review < /tmp/pr.diff → /tmp/review.json
        └── [guard: agent error → warning comment, exit 0]
        └── jq parse → upsert PR comment (marker: <!-- ai-cr-review -->)
        └── gh pr edit --add-label ai-cr:passed|failed
        └── echo "verdict=..." >> $GITHUB_OUTPUT
  └── [if labeled trigger] gh pr edit --remove-label "ai-cr:review"
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Extend CLI with PR context | `reviewDiff()` accepts `prTitle`/`prBody`; `index.ts` reads env vars | Backwards-compat: must not break local CLI usage |
| 2. GHA composite action + workflow | Full workflow live in CI, labels working, comment upsert | `fetch-depth: 0` critical; shell injection via PR body if not using `env:` |

**Prerequisites:** `ANTHROPIC_API_KEY` in GitHub repo secrets ✅ (already configured)
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- `workflow_dispatch` trigger (for smoke testing) passes empty PR metadata — composite action handles this gracefully via the empty-diff guard
- `jq` available on `ubuntu-latest` by default — no installation step needed
- Label `--remove-label` errors silently when label not on PR (`2>/dev/null || true`)

## Success Criteria (Summary)

- PR to master triggers review within ~2 min; comment contains all 5 scores + verdict
- Correct label applied; re-trigger via `ai-cr:review` label works and removes itself
- Workflow check always green (advisory) regardless of verdict
