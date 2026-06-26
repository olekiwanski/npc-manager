---
date: 2026-06-26T08:50:34Z
researcher: Claude Sonnet 4.6
git_commit: 5146b993c21051de2e6330a7b61f2b0b0f990beb
branch: m5l3-ci-cd-code-review
repository: npc-manager
topic: "CI/CD workflow for PR code reviews using packages/code-reviewer agent"
tags: [research, github-actions, code-reviewer, ci-cd, composite-action]
status: complete
last_updated: 2026-06-26
last_updated_by: Claude Sonnet 4.6
---

# Research: CI/CD workflow for PR code reviews

**Date**: 2026-06-26T08:50:34Z
**Researcher**: Claude Sonnet 4.6
**Git Commit**: 5146b993c21051de2e6330a7b61f2b0b0f990beb
**Branch**: m5l3-ci-cd-code-review
**Repository**: npc-manager

## Research Question

Plan the implementation of a GitHub Actions CI/CD workflow for automated PR code reviews, based on
requirements in `context/changes/ci-cd-code-review/requirements.md`. The reviewer agent lives in
`packages/code-reviewer` and uses the Claude Agent SDK.

## Summary

The existing `packages/code-reviewer` agent is already CI-ready: it reads a git diff from stdin,
calls the Claude Agent SDK, and outputs a structured JSON verdict to stdout — no build step needed.
The repo uses GitHub Actions with Node 22. No composite action exists yet, but `.github/actions/`
is free to create. The main integration work is: (1) a new `review.yml` workflow, (2) a composite
action under `.github/actions/ai-review/`, (3) GitHub API calls for PR comments and labels via
`gh` CLI, and (4) one new repo secret (`ANTHROPIC_API_KEY`).

---

## Detailed Findings

### packages/code-reviewer — CLI interface

- **Entrypoint**: `packages/code-reviewer/src/index.ts:1-16`
- **CLI command**: `npm run review` → `tsx src/index.ts`
- **Input**: reads git diff from **stdin** — `process.stdin` async iterator
- **Output**: structured **JSON to stdout** — `JSON.stringify(result, null, 2)` (`src/index.ts:16`)
- **Diagnostics**: cost and turn count written to **stderr** (`src/agent/reviewer.ts:25`)
- **No build step needed**: `tsx` transpiles TypeScript on-the-fly
- **Exit codes**: exits 1 if stdin is empty (`src/index.ts:13`)

**JSON output shape** (`src/common/review-schema.ts:11-21`):
```json
{
  "implementationCorrectness": 8,
  "idiomaticity": 7,
  "complexity": 9,
  "testRiskCoverage": 6,
  "securitySafety": 10,
  "verdict": "pass",
  "summary": "markdown string"
}
```

**CI invocation pattern**:
```bash
git diff origin/$BASE_BRANCH...HEAD | npm run review --prefix=packages/code-reviewer
```

### Authentication in CI

- **Required env var**: `ANTHROPIC_API_KEY` — read implicitly by `@anthropic-ai/claude-agent-sdk`
  (`packages/code-reviewer/src/agent/reviewer.ts:1`)
- **Cost cap**: `maxBudgetUsd: 0.1` hardcoded (`reviewer.ts:12`) — no env var override
- **Repo secret**: `ANTHROPIC_API_KEY` — **already configured** in GitHub repo secrets
  (alongside `SUPABASE_URL` and `SUPABASE_KEY`). No manual setup needed.

### Node.js & dependencies

- **Node version**: 22.14.0 (`.nvmrc`), `node-version: 22` already in `ci.yml:16`
- **Local deps**: `@anthropic-ai/claude-agent-sdk`, `zod`, `tsx` — all in
  `packages/code-reviewer/package.json`
- **Root is not a workspaces monorepo** — need separate `npm ci` for the package, or
  `npm ci --prefix=packages/code-reviewer`

### Existing GitHub Actions setup

- **File**: `.github/workflows/ci.yml`
- **Triggers**: `push` and `pull_request` to `master` (`ci.yml:3-7`)
- **Actions versions**: `checkout@v4`, `setup-node@v4` (`ci.yml:13-14`)
- **Existing secrets**: `SUPABASE_URL`, `SUPABASE_KEY` (no `ANTHROPIC_API_KEY` yet)
- **fetch-depth**: NOT set in existing ci.yml → defaults to `1` (shallow clone).
  The new review workflow **must** set `fetch-depth: 0` to compute cross-branch diffs.
- **Composite actions**: `.github/actions/` does **not** exist — free to create

### GitHub API — PR comments

- **Post comment**: `gh pr comment <number> --body "..."` (requires `GH_TOKEN`)
- **Upsert pattern** (replace on re-run): find by hidden HTML marker, delete old, post new:
  ```bash
  MARKER="<!-- ai-cr-review -->"
  COMMENT_ID=$(gh api repos/$REPO/issues/$PR_NUMBER/comments \
    --jq ".[] | select(.body | contains(\"$MARKER\")) | .id" | head -1)
  [ -n "$COMMENT_ID" ] && gh api --method DELETE repos/$REPO/issues/comments/$COMMENT_ID
  gh pr comment $PR_NUMBER --body "$MARKER ..."
  ```
- **Permissions needed**: `pull-requests: write` (job-level, not workflow-level — least privilege)

### GitHub API — Labels

- **Add label**: `gh pr edit <number> --add-label "ai-cr:passed"`
- **Remove label**: `gh pr edit <number> --remove-label "ai-cr:failed"`
- **Create labels idempotently**: `gh label create "ai-cr:passed" --color "0e8a16" --force`
  (`--force` is a no-op if label already exists)
- **Labels to create**: `ai-cr:passed` (green), `ai-cr:failed` (red), `ai-cr:review` (blue — triggers retry)

### GitHub API — On-demand retry trigger

- **Trigger**: `pull_request: types: [labeled]`
- **Filter**: `if: github.event.label.name == 'ai-cr:review'`
- After running, the workflow should remove the `ai-cr:review` label to allow re-triggering:
  `gh pr edit $PR_NUMBER --remove-label "ai-cr:review"`

### Composite action outputs

- Composite action declares `outputs.verdict` → workflow reads `steps.<id>.outputs.verdict`
- Written via `echo "verdict=pass" >> "$GITHUB_OUTPUT"` inside the action step
- Parent workflow uses verdict to choose which label to apply

### PR metadata — passing to action

- **PR title**: `${{ github.event.pull_request.title }}` (safe inline)
- **PR body**: must use `env:` variable — never inline in `run:` (multi-line / injection risk):
  ```yaml
  env:
    PR_BODY: ${{ github.event.pull_request.body }}
  ```
- **Git diff**: computed on runner after `fetch-depth: 0` checkout:
  ```bash
  git diff origin/${{ github.base_ref }}...HEAD
  ```
  Three-dot range: only commits on the PR branch, excluding base branch changes.

---

## Code References

- `packages/code-reviewer/src/index.ts:1-16` — CLI entrypoint, stdin read, JSON stdout
- `packages/code-reviewer/src/agent/reviewer.ts:1-33` — `reviewDiff()`, SDK usage, cost cap
- `packages/code-reviewer/src/common/review-schema.ts:11-24` — REVIEW_SCHEMA, JSON output shape
- `packages/code-reviewer/package.json:9` — `"review": "tsx src/index.ts"` script
- `.github/workflows/ci.yml:1-26` — existing workflow (Node 22, checkout@v4, secrets)
- `.nvmrc` — Node 22.14.0

---

## Architecture Insights

**Composite action structure** (to create at `.github/actions/ai-review/action.yml`):
```
inputs:  api-key, pr-title, pr-body, diff
outputs: verdict (pass/fail)
steps:
  1. npm ci --prefix=packages/code-reviewer
  2. echo "$diff" | npm run review --prefix=packages/code-reviewer > /tmp/review.json
  3. Parse verdict from JSON, write to $GITHUB_OUTPUT
  4. Post PR comment with summary
  5. Add/remove labels
```

**Two-workflow architecture** (per requirements):
1. `review.yml` — thin orchestrator: checkout (fetch-depth 0), compute diff, call composite action
2. `.github/actions/ai-review/action.yml` — all review logic encapsulated

**Shell injection risk**: `PR_BODY` and diff may contain arbitrary text. Always pass via `env:`
variables or temp files, never inline `${{ ... }}` in `run:` scripts.

**Cost per run**: `~$0.01–$0.04` per review (claude-sonnet-4-6, 2 turns, ~100-line diff).
With `maxBudgetUsd: 0.1` hardcoded, there's a built-in cost cap per run.

---

## Historical Context (from prior changes)

- `context/archive/2026-06-26-code-reviewer-cleanup/` — original code-reviewer implementation,
  translated to English, fixed `message.errors` SDK type mismatch
- `context/archive/2026-06-26-code-reviewer-modularize/` — modularization of reviewer into
  `src/agent/reviewer.ts` + `src/common/review-schema.ts` + `src/index.ts`
- PR #16 (`m5l2-code-reviewer-agent` branch) — root ESLint `{ ignores: ["packages/**"] }` fix;
  agent is on this branch, CI passes

---

## Open Questions

1. **PR body cost tradeoff** (marked `??` in requirements): including PR body adds tokens/cost
   but may improve review quality. Decision: include it but pass via `env:` to avoid injection.
2. **`npm ci` scope**: root `npm ci` does NOT install `packages/code-reviewer/node_modules`.
   Need `npm ci --prefix=packages/code-reviewer` in the composite action. Confirm this is acceptable
   vs adding workspaces to root `package.json`.
3. **`ANTHROPIC_API_KEY` secret**: ✅ already configured in GitHub repo secrets — no manual
   step needed before the workflow can run.
4. **Label creation**: labels (`ai-cr:passed`, `ai-cr:failed`, `ai-cr:review`) don't exist yet —
   the workflow should create them with `gh label create --force` on first run, or they can be
   pre-created manually.
