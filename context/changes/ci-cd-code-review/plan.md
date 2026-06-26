# CI/CD Code Review Workflow Implementation Plan

## Overview

Integrate the existing `packages/code-reviewer` Claude Agent SDK reviewer into GitHub Actions so
every PR to master gets an automated code review with a PR comment and `ai-cr:passed` /
`ai-cr:failed` label. The review is advisory (verdict never blocks merge). The agent also runs
on-demand when the `ai-cr:review` label is added.

## Current State Analysis

The `packages/code-reviewer` package is already CI-ready:
- CLI: `npm run review` reads a git diff from **stdin**, outputs structured JSON to **stdout**
- Auth: `ANTHROPIC_API_KEY` already configured in GitHub repo secrets
- Node 22 already used in `ci.yml`; `.github/actions/` does not exist yet

No GHA workflow for PR review exists. The existing `ci.yml` runs lint + test + build on push/PR
to master and is unrelated to this change.

## Desired End State

Every PR to master automatically receives an AI code review comment with per-criterion scores
(1–10) and a verdict. The PR gets a green `ai-cr:passed` or red `ai-cr:failed` label. Developers
can re-trigger the review by adding the `ai-cr:review` label. The workflow always exits 0
(advisory, not blocking).

### Key Discoveries

- `packages/code-reviewer/src/index.ts:3-16` — reads stdin, outputs `JSON.stringify(result, null, 2)` to stdout; exits 1 if stdin empty
- `packages/code-reviewer/src/agent/reviewer.ts:5` — prompt currently only includes diff; needs PR title + body
- `packages/code-reviewer/src/common/review-schema.ts:11-21` — JSON shape: `implementationCorrectness`, `idiomaticity`, `complexity`, `testRiskCoverage`, `securitySafety`, `verdict` (pass|fail), `summary`
- `.github/workflows/ci.yml:13` — uses `actions/checkout@v4` without `fetch-depth`; review workflow must set `fetch-depth: 0`
- Root is **not** an npm workspaces monorepo → composite action needs `npm ci --prefix=packages/code-reviewer`
- `jq` is available on `ubuntu-latest` by default — safe to use for JSON parsing in bash

## What We're NOT Doing

- No merge gate — verdict never causes workflow exit 1
- No PR body truncation — `maxBudgetUsd: 0.1` in the agent is the cost cap
- No modification of `ci.yml` — review runs in a separate `review.yml` workflow
- No branch protection configuration — out of scope; that's a repo settings concern
- No `10x-impl-review-ci` skill integration — that's a separate change (M5L3 deep dive)

## Implementation Approach

Two-layer architecture:
1. **`review.yml`** — thin orchestrator: checkout, setup-node, ensure labels, call composite action, remove retry label when applicable
2. **`.github/actions/ai-review/action.yml`** — composite action owning all review logic: install deps, compute filtered diff, run agent, parse output, post upsert comment, manage labels

Phase 1 extends the agent CLI to forward PR title + body via env vars so the reviewer has richer context. Phase 2 creates the GHA files.

## Critical Implementation Details

**Shell injection risk**: `PR_TITLE`, `PR_BODY`, and the git diff are user-controlled text. They must always be passed as `env:` variables to shell steps — never interpolated inline with `${{ inputs.pr-title }}` inside `run:` blocks. The composite action receives all inputs as env vars at step level.

**Diff written to temp file**: pipe `git diff … > /tmp/pr.diff` then `< /tmp/pr.diff npm run review` — avoids shell variable size limits on large diffs and keeps the stdin pipe clean.

**`fetch-depth: 0` is mandatory**: the default shallow clone (`depth: 1`) cannot compute `origin/<base>...HEAD` — the merge base is unreachable. The existing `ci.yml` does not set `fetch-depth`; the new workflow must set it explicitly.

**Empty diff after filtering**: when all changed files are excluded (e.g., a lockfile-only PR), the agent's `index.ts` exits 1 ("No diff on stdin"). The composite action must detect an empty `/tmp/pr.diff` before calling the agent and post a neutral comment instead.

**Upsert comment**: use `<!-- ai-cr-review -->` as a stable HTML marker. On each run: find the existing comment by marker via `gh api`, delete it, post the new one. This replaces the comment rather than accumulating.

**Label removal before add**: `gh pr edit --remove-label` errors if the label is not currently on the PR. Suppress with `2>/dev/null || true` before adding the correct label.

---

## Phase 1: Extend code-reviewer CLI with PR context

### Overview

The agent's prompt currently contains only the git diff. PR title and body give the reviewer
context about intent, letting it distinguish deliberate decisions from mistakes. Phase 1 adds
optional `prTitle` and `prBody` parameters forwarded via environment variables.

### Changes Required

#### 1. `packages/code-reviewer/src/agent/reviewer.ts`

**File**: `packages/code-reviewer/src/agent/reviewer.ts`

**Intent**: Extend `reviewDiff()` to accept an optional second argument `opts` containing
`prTitle` and `prBody`. When provided, prepend them to the prompt so the model understands
the stated purpose of the change before reading the diff.

**Contract**: New signature:
```typescript
export async function reviewDiff(
  diff: string,
  opts: { prTitle?: string; prBody?: string } = {}
): Promise<Review>
```
Prompt construction: build a `contextParts` array; push `PR Title: <title>` if `prTitle` is
non-empty, `PR Description:\n<body>` if `prBody` is non-empty, then `Diff:\n${diff}`. Join
with `\n\n` and prefix with `Review this pull request:\n\n`.

#### 2. `packages/code-reviewer/src/index.ts`

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Read `PR_TITLE` and `PR_BODY` from `process.env` and forward them to `reviewDiff()`.
When the env vars are absent (local CLI usage), the function signature defaults make it backwards
compatible — the prompt falls back to diff-only.

**Contract**: After reading stdin, read `process.env.PR_TITLE ?? ''` and `process.env.PR_BODY ?? ''`,
pass as `{ prTitle, prBody }` second argument to `reviewDiff()`.

### Success Criteria

#### Automated Verification

- TypeScript compiles without errors: `cd packages/code-reviewer && npx tsc --noEmit`
- Existing tests pass (no tests for this yet — no regressions expected): `npm run test`
- ESLint clean: `npm run lint`

#### Manual Verification

- `git diff HEAD~1 | npm run review --prefix=packages/code-reviewer` still works (no env vars set)
- `PR_TITLE="Add auth" PR_BODY="Implements OAuth" git diff HEAD~1 | npm run review --prefix=packages/code-reviewer` — output JSON unchanged shape, cost slightly higher (PR body adds tokens)

---

## Phase 2: GitHub Actions — composite action and review workflow

### Overview

Create the two GHA files that wire the agent into every PR. The composite action encapsulates
all review logic; the parent workflow is a thin orchestrator. Together they implement:
automatic review on PR open/push, on-demand retry via label, upsert comment with scores,
and `ai-cr:passed` / `ai-cr:failed` label management.

### Changes Required

#### 1. Composite action

**File**: `.github/actions/ai-review/action.yml`

**Intent**: A self-contained, reusable action that takes PR metadata + diff inputs, runs
the code-reviewer agent, posts an upsert PR comment with the full scorecard, manages
`ai-cr:passed`/`ai-cr:failed` labels, and outputs the verdict string.

**Contract** — inputs, outputs, steps:

```yaml
# inputs
api-key:       required: true   # ANTHROPIC_API_KEY
github-token:  required: true   # GITHUB_TOKEN for gh CLI
pr-number:     required: true   # PR number (github.event.pull_request.number)
pr-title:      required: true   # PR title (github.event.pull_request.title)
pr-body:       required: false  # PR description (github.event.pull_request.body)
base-ref:      required: true   # target branch (github.base_ref)

# outputs
verdict:
  description: '"pass" or "fail"'
  value: ${{ steps.review.outputs.verdict }}
```

Steps (all `shell: bash`, all sensitive values via `env:` not inline `${{ }}`):

**Step A — Install package deps**:
```bash
npm ci --prefix=packages/code-reviewer
```

**Step B — Compute filtered diff** (write to temp file):
```bash
git diff "origin/${BASE_REF}...HEAD" \
  -- \
  ':(exclude)package-lock.json' \
  ':(exclude)yarn.lock' \
  ':(exclude)pnpm-lock.yaml' \
  ':(exclude)*.lock' \
  ':(exclude)dist/**' \
  ':(exclude).wrangler/**' > /tmp/pr.diff
```

**Step C — Guard: empty diff** (post neutral comment and exit 0):
```bash
if [ ! -s /tmp/pr.diff ]; then
  [ -z "${PR_NUMBER}" ] && { echo "verdict=pass" >> "$GITHUB_OUTPUT"; exit 0; }
  gh pr comment "${PR_NUMBER}" --body \
    "<!-- ai-cr-review -->🤖 No meaningful code changes detected after filtering generated files. Skipping review."
  echo "verdict=pass" >> "$GITHUB_OUTPUT"
  exit 0
fi
```

**Step D — Run agent** (capture stdout + stderr separately):
```bash
npm run review --prefix=packages/code-reviewer < /tmp/pr.diff \
  > /tmp/review.json 2>/tmp/review.err
REVIEW_EXIT=$?
```

**Step E — Handle agent error** (soft: post warning comment, exit 0):
```bash
if [ "$REVIEW_EXIT" -ne 0 ]; then
  ERROR_MSG=$(cat /tmp/review.err 2>/dev/null | head -5 || echo "unknown error")
  gh pr comment "${PR_NUMBER}" --body \
    "<!-- ai-cr-review -->⚠️ AI code review could not complete: \`${ERROR_MSG}\`"
  echo "verdict=pass" >> "$GITHUB_OUTPUT"
  exit 0
fi
```

**Step F — Parse JSON with jq** and build scorecard comment (upsert via marker):
```bash
VERDICT=$(jq -r '.verdict' /tmp/review.json)
SUMMARY=$(jq -r '.summary' /tmp/review.json)
IMPL=$(jq -r '.implementationCorrectness' /tmp/review.json)
IDIO=$(jq -r '.idiomaticity' /tmp/review.json)
COMP=$(jq -r '.complexity' /tmp/review.json)
TEST=$(jq -r '.testRiskCoverage' /tmp/review.json)
SEC=$(jq -r '.securitySafety' /tmp/review.json)

VERDICT_ICON="✅ PASSED"
[ "$VERDICT" = "fail" ] && VERDICT_ICON="❌ FAILED"

MARKER="<!-- ai-cr-review -->"

# Upsert: delete old comment if present
OLD_ID=$(gh api "repos/{owner}/{repo}/issues/${PR_NUMBER}/comments" \
  --jq ".[] | select(.body | startswith(\"$MARKER\")) | .id" | head -1)
[ -n "$OLD_ID" ] && gh api --method DELETE "repos/{owner}/{repo}/issues/comments/${OLD_ID}"

gh pr comment "${PR_NUMBER}" --body "${MARKER}
## 🤖 AI Code Review — ${VERDICT_ICON}

| Criterion | Score |
|---|---|
| Implementation Correctness | ${IMPL}/10 |
| Idiomaticity | ${IDIO}/10 |
| Complexity | ${COMP}/10 |
| Test / Risk Coverage | ${TEST}/10 |
| Security & Safety | ${SEC}/10 |

### Summary

${SUMMARY}

---
*Re-run by adding the \`ai-cr:review\` label*"
```

**Step G — Manage labels** (this step must have `id: review` in action.yml so that `outputs.verdict.value: ${{ steps.review.outputs.verdict }}` resolves correctly):
```bash
# Remove both labels (suppress error if not present)
gh pr edit "${PR_NUMBER}" --remove-label "ai-cr:passed" 2>/dev/null || true
gh pr edit "${PR_NUMBER}" --remove-label "ai-cr:failed" 2>/dev/null || true

# Add verdict label
if [ "$VERDICT" = "pass" ]; then
  gh pr edit "${PR_NUMBER}" --add-label "ai-cr:passed"
else
  gh pr edit "${PR_NUMBER}" --add-label "ai-cr:failed"
fi

echo "verdict=${VERDICT}" >> "$GITHUB_OUTPUT"
```

GHA composite actions have no job-level `env:` — each step needs its own `env:` block with
the variables it actually uses. Assign per step as follows:

| Step | env vars required |
|---|---|
| B (diff) | `BASE_REF` |
| C (empty-diff guard) | `GH_TOKEN`, `PR_NUMBER` |
| D (run agent) | `ANTHROPIC_API_KEY`, `PR_TITLE`, `PR_BODY` |
| E (error handler) | `GH_TOKEN`, `PR_NUMBER` |
| F (parse + comment) | `GH_TOKEN`, `PR_NUMBER` |
| G (labels) | `GH_TOKEN`, `PR_NUMBER` |

Example mapping from inputs to env vars (apply this pattern on each relevant step):
```yaml
env:
  ANTHROPIC_API_KEY: ${{ inputs.api-key }}
  GH_TOKEN: ${{ inputs.github-token }}
  PR_TITLE: ${{ inputs.pr-title }}
  PR_BODY: ${{ inputs.pr-body }}
  PR_NUMBER: ${{ inputs.pr-number }}
  BASE_REF: ${{ inputs.base-ref }}
```

#### 2. Review workflow

**File**: `.github/workflows/review.yml`

**Intent**: Thin orchestrator. Triggers on PR events and the retry label. Checks out with full
history, sets up Node, ensures the three labels exist in the repo, calls the composite action,
and removes `ai-cr:review` when that was the trigger.

**Contract**:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, labeled]
    branches: [master]
  workflow_dispatch:   # allows manual trigger from GitHub UI for testing

jobs:
  review:
    # Skip the 'labeled' event unless it's the retry label
    if: >
      github.event_name == 'workflow_dispatch' ||
      github.event.action != 'labeled' ||
      github.event.label.name == 'ai-cr:review'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write   # comment + labels

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # required for git diff origin/<base>...HEAD

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Ensure review labels exist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh label create "ai-cr:passed"  --color "0e8a16" --description "AI review passed"  --force
          gh label create "ai-cr:failed"  --color "e11d48" --description "AI review failed"  --force
          gh label create "ai-cr:review"  --color "0075ca" --description "Request AI review" --force

      - id: ai-review
        uses: ./.github/actions/ai-review
        with:
          api-key:      ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          pr-number:    ${{ github.event.pull_request.number }}
          pr-title:     ${{ github.event.pull_request.title }}
          pr-body:      ${{ github.event.pull_request.body }}
          base-ref:     ${{ github.base_ref }}

      - name: Remove retry label
        if: github.event.action == 'labeled' && github.event.label.name == 'ai-cr:review'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr edit ${{ github.event.pull_request.number }} --remove-label "ai-cr:review"
```

`workflow_dispatch` doesn't set `github.event.pull_request.*` — it is included only as a manual
trigger for first-run smoke testing. When `PR_NUMBER` is empty, Step C exits early before calling
`gh pr comment` (which would fail on an empty PR number), so the job still exits cleanly.

### Success Criteria

#### Automated Verification

- YAML is valid and passes `actionlint` if available: `npx --yes actionlint .github/workflows/review.yml`
- ESLint passes (packages/** already excluded): `npm run lint`
- TypeScript compiles: `cd packages/code-reviewer && npx tsc --noEmit`

#### Manual Verification

- Open a new PR to master (or push to an existing one) → within ~2 minutes a review comment appears with the scorecard table
- Comment contains all 5 criterion scores and a markdown summary
- PR gets either `ai-cr:passed` (green) or `ai-cr:failed` (red) label — not both
- Add `ai-cr:review` label to the PR → workflow re-runs; after completion the `ai-cr:review` label is removed and the verdict label updates
- Push a second commit to the PR → review re-runs and existing comment is replaced (not duplicated)
- Workflow check stays green regardless of verdict (advisory, not blocking)

---

## Testing Strategy

### Automated Verification

- TypeScript types (`npx tsc --noEmit` in the package) catch signature mismatches
- ESLint enforces no unsafe types
- `actionlint` (if installed) validates workflow syntax

### Manual Testing Steps

1. Open a real PR to master from this branch and observe the workflow in GitHub Actions tab
2. Verify comment appears with correct JSON fields mapped to table rows
3. Verify label color matches verdict
4. Add `ai-cr:review` label and confirm re-run + label removal
5. Push an empty commit (`git commit --allow-empty`) and confirm comment replaces (not appends)

## References

- Research: `context/changes/ci-cd-code-review/research.md`
- Requirements: `context/changes/ci-cd-code-review/requirements.md`
- Agent entrypoint: `packages/code-reviewer/src/index.ts:1-16`
- Review schema: `packages/code-reviewer/src/common/review-schema.ts:11-21`
- Existing CI: `.github/workflows/ci.yml`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Extend code-reviewer CLI with PR context

#### Automated

- [x] 1.1 TypeScript compiles without errors (npx tsc --noEmit in package)
- [x] 1.2 ESLint passes (npm run lint)
- [x] 1.3 Tests pass (npm run test)

#### Manual

- [x] 1.4 `git diff HEAD~1 | npm run review` still works without env vars set
- [x] 1.5 `PR_TITLE="Add auth" PR_BODY="test" git diff HEAD~1 | npm run review` produces valid JSON output

### Phase 2: GitHub Actions — composite action and review workflow

#### Automated

- [ ] 2.1 YAML is valid (actionlint or manual inspection)
- [ ] 2.2 ESLint passes (npm run lint)
- [ ] 2.3 TypeScript compiles (npx tsc --noEmit in package)

#### Manual

- [ ] 2.4 PR to master triggers review workflow — comment appears with scorecard table
- [ ] 2.5 Correct label applied (ai-cr:passed green or ai-cr:failed red), never both
- [ ] 2.6 Adding ai-cr:review label re-triggers review and removes itself after run
- [ ] 2.7 New push to PR replaces existing comment (not appends)
- [ ] 2.8 Workflow check stays green regardless of verdict
