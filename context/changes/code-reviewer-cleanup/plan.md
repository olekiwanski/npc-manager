# code-reviewer-cleanup Implementation Plan

## Overview

Fix a runtime bug in `reviewer.ts` where `message.errors` (non-existent) is accessed instead of `message.result`, add the missing `maxBudgetUsd` cost cap, and translate all Polish strings in the package to English for consistency with the rebuilt English SKILL.md.

## Current State Analysis

Three source files, all small:

- `src/agent/reviewer.ts` (32 lines) — exports `reviewDiff`. Contains the API bug (`message.errors.join("; ")`), missing `maxBudgetUsd`, Polish log and error strings, Polish user prompt.
- `src/common/review-schema.ts` (27 lines) — Zod schema, `SYSTEM_PROMPT`, `REVIEW_JSON_SCHEMA`. All model-facing strings in Polish.
- `src/index.ts` (17 lines) — thin CLI. One Polish error message.

No other source files. No tests to update.

## Desired End State

All three source files compile cleanly, strings are in English, `maxBudgetUsd: 0.10` is set, and the error path uses `message.result` (always present on non-success results per the SDK TS reference). A live run `git diff HEAD~1 | npx tsx src/index.ts` produces a valid English-language JSON review.

## What We're NOT Doing

- No new features beyond what's listed
- No promptfoo eval configuration
- No session resumption
- No changes to the Zod schema structure or field names

## Implementation Approach

Two sequential phases. Phase 1 fixes the critical bug in `reviewer.ts` and adds the cost cap. Phase 2 translates the model-facing strings in `review-schema.ts` and the CLI string in `index.ts`. The live manual verification runs at the end of Phase 2.

## Critical Implementation Details

**SDK error result fields** — `SDKResultMessage` on non-success has `result: string` (always present, human-readable text) and `error?: SDKResultError` (optional). There is no `errors: string[]`. Use `message.result` directly.

---

## Phase 1: Fix reviewer.ts

### Overview

Fix the `message.errors` → `message.result` bug, add `maxBudgetUsd: 0.10`, and translate the two Polish strings in this file (log line and user prompt).

### Changes Required:

#### 1. `src/agent/reviewer.ts`

**File**: `packages/code-reviewer/src/agent/reviewer.ts`

**Intent**: Replace `message.errors.join("; ")` with `message.result`; add `maxBudgetUsd: 0.10` to the options object; translate the user prompt and the `[info]` log line to English.

**Contract**:
```typescript
options: {
  systemPrompt: SYSTEM_PROMPT,
  model: "claude-sonnet-4-6",
  tools: [],
  maxTurns: 2,
  maxBudgetUsd: 0.10,
  outputFormat: { type: "json_schema", schema: REVIEW_JSON_SCHEMA },
}
// ...
console.error(`[info] cost: $${message.total_cost_usd.toFixed(6)} | turns: ${message.num_turns}`);
// ...
throw new Error(`Review failed (${message.subtype}): ${message.result}`);
// ...
throw new Error("Agent returned no result");
// user prompt:
prompt: `Review this diff:\n\n${diff}`,
```

### Success Criteria:

#### Automated Verification:

- `npx tsx --noEmit packages/code-reviewer/src/agent/reviewer.ts` exits without type errors (or `npx tsc --noEmit` from the package root if tsconfig is present)
- No Polish strings remain in `src/agent/reviewer.ts`

#### Manual Verification:

- File diff shows `message.result` replacing `message.errors`, `maxBudgetUsd` present, and all strings in English

---

## Phase 2: Translate review-schema.ts and index.ts

### Overview

Translate `SYSTEM_PROMPT`, all `.describe()` strings in the Zod schema, and the one CLI error message in `index.ts` to English. This is the last change — run the live verification here.

### Changes Required:

#### 1. `src/common/review-schema.ts`

**File**: `packages/code-reviewer/src/common/review-schema.ts`

**Intent**: Replace the Polish `SYSTEM_PROMPT` with an equivalent English prompt, and translate all five `.describe()` strings and the `verdict` / `summary` descriptions to English. Keep field names unchanged.

**Contract**: The prompt must preserve the same evaluation criteria (5 dimensions 1-10, pass/fail verdict, Markdown summary). Example English SYSTEM_PROMPT:

```
You are a precise, constructive code reviewer evaluating a pull request.
Score the diff on five criteria on a scale of 1-10 (1 = critical issues, 10 = exemplary):
implementation correctness, idiomaticity, complexity, test coverage relative to risk, security.
Then issue a binding verdict (pass/fail) for the entire change and include a short summary (2-3 sentences)
in Markdown that gives the PR author clear, actionable next steps.
```

Zod field descriptions follow the pattern `"<Dimension>: <what it measures> (scale 1-10)"` — translate each one, keeping the same structure.

#### 2. `src/index.ts`

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Replace the single Polish error message with its English equivalent.

**Contract**: `"No diff on stdin. Usage: git diff | npx tsx src/index.ts"`

### Success Criteria:

#### Automated Verification:

- No Polish strings remain in any of the three source files (grep check)
- TypeScript check passes: no type errors introduced

#### Manual Verification:

- Live run: `git diff HEAD~1 | npx tsx packages/code-reviewer/src/index.ts` produces valid JSON with English `summary` field and either `"pass"` or `"fail"` verdict
- Stderr shows English cost log: `[info] cost: $X | turns: N`

---

## Testing Strategy

### Manual Testing Steps:

1. After Phase 1: inspect `reviewer.ts` diff — confirm `message.result`, `maxBudgetUsd`, English strings
2. After Phase 2: run `git diff HEAD~2 | npx tsx packages/code-reviewer/src/index.ts` from repo root
3. Confirm JSON output contains `verdict`, `summary` (in English), and all five numeric fields

## References

- SDK error types: `packages/code-reviewer/.claude/skills/ai-sdk/references/api-typescript.md`
- Source files: `packages/code-reviewer/src/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Fix reviewer.ts

#### Automated

- [x] 1.1 No type errors in reviewer.ts
- [x] 1.2 No Polish strings remain in reviewer.ts

#### Manual

- [x] 1.3 Diff shows message.result, maxBudgetUsd, English strings

### Phase 2: Translate review-schema.ts and index.ts

#### Automated

- [ ] 2.1 No Polish strings remain in any source file
- [ ] 2.2 No TypeScript errors introduced

#### Manual

- [ ] 2.3 Live run produces valid JSON with English summary
- [ ] 2.4 Stderr shows English cost log
