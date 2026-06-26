# Promptfoo Eval Suite for `@packages/code-reviewer` — Implementation Plan

## Overview

Introduce promptfoo into `packages/code-reviewer` to run the existing code-review system prompt against three models (haiku-4-5, sonnet-4-6, opus-4-8) on a single complex Supabase migration diff, using a static verdict assertion and an LLM-as-judge rubric.

## Current State Analysis

- `src/agent/reviewer.ts:17` — model hardcoded as `"claude-sonnet-4-6"`; not externally configurable
- `src/common/review-schema.ts:3` — `SYSTEM_PROMPT` is a plain exported string; reusable as-is
- `src/common/review-schema.ts:24` — `REVIEW_JSON_SCHEMA` is a JSON Schema draft-07 object; reusable as-is
- `package.json` — no `promptfoo` dependency; no eval scripts
- No `evals/` directory exists yet
- `@anthropic-ai/claude-agent-sdk` is already installed — promptfoo's native provider will use it as a peer dep

## Desired End State

Running `npm run eval` from `packages/code-reviewer` drives promptfoo against all three models, produces a terminal comparison table, and exits non-zero if any assertion fails. `promptfoo view` opens the local web UI for side-by-side score comparison. A GitHub Actions `workflow_dispatch` workflow allows triggering the same run from the GitHub UI.

### Key Discoveries

- `reviewer.ts:17` must change from a literal to `opts.model ?? "claude-sonnet-4-6"` before `reviewDiff()` is properly reusable — the native promptfoo provider doesn't call this function, but the fix is still correct housekeeping
- The native `anthropic:claude-agent-sdk` promptfoo provider accepts `system`, `outputFormat`, `maxTurns`, and `maxBudgetUsd` directly — no custom TypeScript provider wrapper needed
- YAML merge keys (`<<: *anchor`) let the three provider blocks share `system`, `outputFormat`, and `maxTurns` without repetition; promptfoo's YAML parser supports standard YAML 1.2 anchors
- The LLM judge should run on `claude-haiku-4-5-20251001` (cheapest capable model); configured globally via `defaultTest.options.provider` so it applies to every `llm-rubric` assertion without per-assertion boilerplate
- `ANTHROPIC_API_KEY` is not yet a GitHub Actions secret in this repo — it must be added manually before the CI workflow can run

## What We're NOT Doing

- No custom TypeScript provider — the native SDK provider covers multi-model comparison cleanly
- No multiple diff fixtures — one complex migration diff, as specified
- No automatic PR trigger — `workflow_dispatch` only (budget safety)
- No changes to `SYSTEM_PROMPT` or `REVIEW_SCHEMA` — both are reused verbatim
- No promptfoo cloud sharing (`--share` flag never used — all data stays local)

## Implementation Approach

Three phases in dependency order: (1) prepare the package — model param + promptfoo install; (2) build the eval suite — fixture diff + config; (3) wire CI. Phases 2 and 3 have no dependency on each other and can proceed in parallel, but Phase 1 must complete first.

## Critical Implementation Details

**YAML anchor placement**: The anchor `&reviewer-config` must be placed on a top-level extension key (e.g. `x-reviewer-config`) that promptfoo does not validate. Without the `x-` prefix, promptfoo may reject the key as an unknown top-level field. The merge key `<<: *reviewer-config` is then used inside each provider's `config` block.

**`outputFormat` schema source**: The YAML schema block inside `outputFormat` is a hand-transcribed version of `REVIEW_JSON_SCHEMA` from `review-schema.ts:24`. If the Zod schema changes, the YAML must be updated manually — there is no automatic sync.

**`maxBudgetUsd` per model**: Haiku and Sonnet share `0.05`; Opus gets `0.20` because a single opus call on a 50-line diff can approach $0.12. Setting it too low on Opus causes the agent to abort mid-review and return an error result.

---

## Phase 1: Prepare the Package

### Overview

Add `model` as an optional parameter to `reviewDiff()`, install promptfoo as a dev dependency, and add the two npm scripts needed to run and view evals.

### Changes Required

#### 1. Parameterize `reviewDiff`

**File**: `packages/code-reviewer/src/agent/reviewer.ts`

**Intent**: Make the model externally configurable so the function can be called with any model string. The hardcoded literal is replaced with a default-fallback pattern.

**Contract**: The `opts` parameter type gains `model?: string`. The `query()` call on line 13 changes `model: "claude-sonnet-4-6"` to `model: opts.model ?? "claude-sonnet-4-6"`. The public interface of `reviewDiff` is otherwise unchanged — callers that pass no `opts` get the same behaviour as today.

#### 2. Install promptfoo and wire scripts

**File**: `packages/code-reviewer/package.json`

**Intent**: Add promptfoo as a dev dependency and expose two scripts — one to run evals, one to open the local comparison UI.

**Contract**: Add `"promptfoo": "latest"` under `devDependencies`. Add two entries to `scripts`:
- `"eval"` → `"promptfoo eval --config evals/promptfooconfig.yaml"`
- `"eval:view"` → `"promptfoo view"`

Run `npm install` in `packages/code-reviewer` after editing to update `package-lock.json`.

### Success Criteria

#### Automated Verification

- `tsx src/index.ts` still accepts stdin diff (existing CLI unaffected): `echo "diff" | npx tsx src/index.ts`
- `npm run eval --help` exits 0 (promptfoo binary resolves correctly)

#### Manual Verification

- Confirm `node_modules/.bin/promptfoo` exists in the package after install

**Implementation Note**: After automated verification passes, confirm manually that the CLI still works before proceeding to Phase 2.

---

## Phase 2: Build the Eval Suite

### Overview

Create the `evals/` directory with two files: the migration diff fixture and the promptfoo configuration. The fixture contains three intentional bugs; the config wires three providers, the inlined schema, and the assertion stack.

### Changes Required

#### 1. Migration diff fixture

**File**: `packages/code-reviewer/evals/diffs/complex-migration.diff`

**Intent**: Provide a realistic but self-contained Supabase SQL migration diff that contains exactly three identifiable bugs, so the LLM judge has unambiguous ground truth to check against.

**Contract**: The file must be a well-formed git unified diff (standard `diff --git a/… b/…` header, `--- /dev/null`, `+++ b/…`, `@@ … @@` hunk). The three bugs embedded in the `+` lines are:

1. **NOT NULL without DEFAULT** — `ALTER TABLE npcs ADD COLUMN last_session_id UUID NOT NULL;` (line ~5 inside the hunk). Any non-empty `npcs` table will reject this migration at runtime.
2. **RLS with no policies** — `ALTER TABLE encounter_sessions ENABLE ROW LEVEL SECURITY;` appears, but no `CREATE POLICY` follows for `encounter_sessions`. The table is effectively locked to all users.
3. **Wrong FK target** — `npc_id UUID NOT NULL REFERENCES characters(id)` should reference `npcs(id)`. The `characters` table may not exist, or if it does the FK is semantically wrong.

The diff should also include correct surrounding content (indexes, a second table with a proper policy) so the reviewer must work to distinguish bugs from correct code. Approximate size: 50–60 added lines.

```diff
diff --git a/supabase/migrations/20260626120000_add_encounter_tracking.sql b/supabase/migrations/20260626120000_add_encounter_tracking.sql
new file mode 100644
index 0000000..0000000
--- /dev/null
+++ b/supabase/migrations/20260626120000_add_encounter_tracking.sql
@@ -0,0 +1,55 @@
+-- Migration: encounter session tracking for game masters
+-- Records which NPCs appeared in each game session.
+
+-- Extend npcs with a reference to the session they last appeared in.
+ALTER TABLE npcs ADD COLUMN last_session_id UUID NOT NULL;
+
+-- One row per game session.
+CREATE TABLE encounter_sessions (
+  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
+  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
+  campaign_id   UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
+  session_name  TEXT        NOT NULL,
+  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
+  ended_at      TIMESTAMPTZ,
+  session_notes TEXT
+);
+
+ALTER TABLE encounter_sessions ENABLE ROW LEVEL SECURITY;
+
+-- Many-to-many: which NPCs appeared in which session.
+CREATE TABLE session_npcs (
+  session_id     UUID        NOT NULL REFERENCES encounter_sessions(id) ON DELETE CASCADE,
+  npc_id         UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
+  encountered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
+  PRIMARY KEY (session_id, npc_id)
+);
+
+ALTER TABLE session_npcs ENABLE ROW LEVEL SECURITY;
+
+CREATE POLICY "Users own their session NPCs"
+  ON session_npcs
+  FOR ALL TO authenticated
+  USING (
+    session_id IN (
+      SELECT id FROM encounter_sessions
+       WHERE user_id = auth.uid()
+    )
+  )
+  WITH CHECK (
+    session_id IN (
+      SELECT id FROM encounter_sessions
+       WHERE user_id = auth.uid()
+    )
+  );
+
+-- Performance indexes
+CREATE INDEX idx_encounter_sessions_user     ON encounter_sessions(user_id);
+CREATE INDEX idx_encounter_sessions_campaign ON encounter_sessions(campaign_id);
+CREATE INDEX idx_session_npcs_session        ON session_npcs(session_id);
```

#### 2. Promptfoo configuration

**File**: `packages/code-reviewer/evals/promptfooconfig.yaml`

**Intent**: Define three providers sharing the same system prompt and output schema, one test case pointing at the diff fixture, and a four-assertion stack: structural JSON check, score range validation, static verdict check, and LLM judge rubric.

**Contract**: The file must have these top-level keys in order: `description`, `x-reviewer-config` (YAML anchor source), `defaultTest`, `providers`, `prompts`, `tests`.

- `defaultTest.options.provider` → `anthropic:messages:claude-haiku-4-5-20251001` (judge model for all `llm-rubric` assertions)
- Three providers, all `id: anthropic:claude-agent-sdk`, labels `haiku-4-5` / `sonnet-4-6` / `opus-4-8`; each merges `*reviewer-config` and sets its own `model` and `maxBudgetUsd` (haiku+sonnet: `0.05`, opus: `0.20`)
- `system` block: verbatim copy of `SYSTEM_PROMPT` from `review-schema.ts:3-7`
- `outputFormat.schema`: transcription of `REVIEW_JSON_SCHEMA` from `review-schema.ts:24` — all seven fields, `additionalProperties: false`, `required` array containing all seven
- `prompts`: single entry `"Review this pull request:\n\n{{diff}}"`
- `tests[0].vars.diff`: `file://diffs/complex-migration.diff`
- Four assertions in order:

```yaml
assert:
  - type: is-json

  - type: javascript
    value: |
      const d = JSON.parse(output);
      return ['implementationCorrectness','idiomaticity','complexity',
              'testRiskCoverage','securitySafety']
        .every(k => typeof d[k] === 'number' && d[k] >= 1 && d[k] <= 10);

  - type: javascript
    value: "JSON.parse(output).verdict === 'fail'"

  - type: llm-rubric
    value: |
      The code review must identify at least two of these three bugs:
      1. NOT NULL column added to 'npcs' without a DEFAULT — will error on any non-empty table
      2. RLS enabled on 'encounter_sessions' but no policies defined — table is inaccessible to all users
      3. 'session_npcs.npc_id' references 'characters(id)' instead of 'npcs(id)' — wrong FK target
      Return pass only if the review summary explicitly names at least two of the issues above.
```

### Success Criteria

#### Automated Verification

- `promptfoo eval --config evals/promptfooconfig.yaml` exits 0 (all assertions pass for all three models)
- Terminal output shows a 3-column comparison table (one column per model)
- No provider returns an error result (check for red rows in the table)

#### Manual Verification

- Run `npm run eval:view` and confirm the web UI opens showing scores and summary text per model
- Confirm the LLM judge marks the rubric assertion as passing for at least one model (green checkmark in UI)
- Read each model's `summary` field; confirm it mentions identifiable bugs from the fixture

**Implementation Note**: If `promptfoo eval` fails with a provider error on opus-4-8, check whether `maxBudgetUsd: 0.20` is sufficient for the diff size. Increase to `0.30` if the agent is aborting early.

---

## Phase 3: CI Workflow

### Overview

Add a `workflow_dispatch`-triggered GitHub Actions workflow that installs deps and runs `npm run eval` in the `packages/code-reviewer` directory.

### Changes Required

#### 1. Eval workflow

**File**: `.github/workflows/evals.yml`

**Intent**: Allow a manual "Run workflow" trigger from the GitHub Actions UI to execute the full eval suite against all three models. Results are visible in the workflow logs; non-zero exit fails the run.

**Contract**: The workflow has a single job (`evals`) with `runs-on: ubuntu-latest`. The `defaults.run.working-directory` is `packages/code-reviewer`. Steps: checkout → setup-node (version `22`) → `npm ci` → `npm run eval` (with `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`).

```yaml
name: Code Review Evals
on:
  workflow_dispatch:

jobs:
  evals:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/code-reviewer
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: packages/code-reviewer/package-lock.json
      - run: npm ci
      - run: npm run eval
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Success Criteria

#### Automated Verification

- Workflow file passes YAML lint (`yamllint .github/workflows/evals.yml`)
- Workflow appears in the GitHub Actions UI under "Actions → Code Review Evals"

#### Manual Verification

- **Before triggering**: confirm `ANTHROPIC_API_KEY` is added as a repository secret in GitHub (Settings → Secrets → Actions)
- Trigger via "Run workflow" button in GitHub Actions UI
- Confirm workflow completes green and logs show the 3-column promptfoo comparison table

---

## Testing Strategy

### Automated Checks

- `is-json` — all three models must return parseable JSON (catches hallucinated prose)
- `javascript` score range — all five numeric scores must be 1–10 inclusive
- `javascript` verdict — static ground-truth check: known-bad diff must produce `"fail"` from every model

### LLM-as-Judge

- `llm-rubric` on `claude-haiku-4-5-20251001` — verifies the review summary names ≥2 of the 3 embedded bugs; this is a semantic check that static assertions cannot express

### Manual Spot-check

- Read each model's `summary` and compare the depth of bug identification across haiku / sonnet / opus — this is the primary learning objective of the eval

## Performance Considerations

Estimated cost per `npm run eval` run (1 diff × 3 models + 3 judge calls):

| Call | Model | ~Cost |
|---|---|---|
| Review | haiku-4-5 | $0.003 |
| Review | sonnet-4-6 | $0.020 |
| Review | opus-4-8 | $0.120 |
| Judge × 3 | haiku-4-5 | $0.006 |
| **Total** | | **~$0.15** |

Well within the $1 budget. Six runs per dollar; ~$0.15 per full comparison.

## References

- Research: `context/changes/code-review-evals/research.md`
- `packages/code-reviewer/src/agent/reviewer.ts:17` — model hardcoded (Phase 1 target)
- `packages/code-reviewer/src/common/review-schema.ts:3` — SYSTEM_PROMPT source for YAML inline
- `packages/code-reviewer/src/common/review-schema.ts:24` — REVIEW_JSON_SCHEMA source for YAML inline
- promptfoo native provider docs: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/
- promptfoo assertions: https://www.promptfoo.dev/docs/configuration/expected-outputs/

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Prepare the Package

#### Automated

- [x] 1.1 Existing CLI still works after model param change: `echo "diff" | npx tsx src/index.ts` — d2c25e6
- [x] 1.2 promptfoo binary resolves: `npm run eval --help` exits 0 — d2c25e6

#### Manual

- [x] 1.3 `node_modules/.bin/promptfoo` exists after install — d2c25e6

### Phase 2: Build the Eval Suite

#### Automated

- [x] 2.1 `promptfoo eval --config evals/promptfooconfig.yaml` exits 0
- [x] 2.2 Terminal shows 3-column comparison table with no red (error) rows

#### Manual

- [x] 2.3 `npm run eval:view` opens web UI with scores and summaries per model
- [x] 2.4 LLM judge marks rubric assertion green for at least one model
- [x] 2.5 Each model's `summary` field mentions identifiable bugs from the fixture

### Phase 3: CI Workflow

#### Automated

- [ ] 3.1 Workflow file is valid YAML (`yamllint .github/workflows/evals.yml`)
- [ ] 3.2 Workflow appears in GitHub Actions UI under "Code Review Evals"

#### Manual

- [x] 3.3 `ANTHROPIC_API_KEY` added as a repository secret before first trigger
- [ ] 3.4 "Run workflow" button triggers successfully and logs show comparison table
