---
date: 2026-06-26T00:00:00+00:00
researcher: ArrogantPigeon
git_commit: 8b7062cf7ca78086d43050effad43eb142de57b9
branch: master
repository: npc-manager
topic: "code-review-evals — promptfoo eval suite for @packages/code-reviewer model comparison"
tags: [research, evals, code-reviewer, promptfoo, claude-agent-sdk, evalite, braintrust]
status: complete
last_updated: 2026-06-26
last_updated_by: ArrogantPigeon
---

# Research: Eval Suite for `@packages/code-reviewer` — Promptfoo and Alternatives

**Date**: 2026-06-26
**Researcher**: ArrogantPigeon
**Git Commit**: 8b7062cf7ca78086d43050effad43eb142de57b9
**Branch**: master
**Repository**: npc-manager

## Research Question

Analyze the current state of `@packages/code-reviewer` in the context of potential eval introduction — reusability of prompts, importability of agent, etc. Primary toolkit preference: promptfoo. If the tech stack is aligned, go in that direction. Otherwise analyze other OSS tools.

---

## Summary

**promptfoo is a strong fit.** It has a first-class `anthropic:claude-agent-sdk` native provider that wraps the same SDK the package uses, so multi-model comparison can be wired with minimal friction and without needing to import `reviewDiff()` at all. The `SYSTEM_PROMPT` and `REVIEW_JSON_SCHEMA` are fully reusable as-is. The **one blocker** that needs fixing before evals can run: `model` is hardcoded in `reviewer.ts` at `"claude-sonnet-4-6"` — it must become a parameter. Alternatively, bypass `reviewDiff()` entirely and use the native promptfoo provider. Both paths are viable.

Best alternatives in order: **Evalite** (Vitest-native, zero-friction ESM, no cloud) and **Braintrust** (cloud UI for persistent experiment tracking).

---

## Detailed Findings

### 1. Package Architecture — Eval Readiness

**Source files** (`packages/code-reviewer/`):
- `src/common/review-schema.ts` — exports `SYSTEM_PROMPT` (plain string), `REVIEW_SCHEMA` (Zod v4), `REVIEW_JSON_SCHEMA` (JSON Schema draft-07), `Review` type
- `src/agent/reviewer.ts` — exports `reviewDiff(diff, opts)` as the main agent function
- `src/index.ts` — CLI entry point (stdin → stdout); not relevant for evals

**Tech stack signals:**
- `"type": "module"` — ESM throughout
- `"exports": { ".": "./src/agent/reviewer.ts" }` — TS source exported directly (no build step)
- `@anthropic-ai/claude-agent-sdk` v0.3.193 — uses `query()` with `outputFormat: { type: "json_schema", ... }`
- Zod v4 for schema + `z.toJSONSchema()` with `target: "draft-07"` for SDK compatibility
- `tsx` as dev runner; **no tsconfig.json** in the package

**What IS reusable:**
| Artifact | Location | Reusable? |
|---|---|---|
| `SYSTEM_PROMPT` | `review-schema.ts:3-7` | ✓ Plain string — inline or `file://` reference |
| `REVIEW_JSON_SCHEMA` | `review-schema.ts:24` | ✓ Standard JSON Schema object — paste into promptfoo config |
| `REVIEW_SCHEMA` (Zod) | `review-schema.ts:11-21` | ✓ Import in custom `.ts` provider assertions |
| `reviewDiff()` | `reviewer.ts:4-41` | ✓ Importable — but model is hardcoded |

**What needs changing before evals:**
- `reviewer.ts:17` hardcodes `model: "claude-sonnet-4-6"` — must become a parameter or env-driven for multi-model comparison.

---

### 2. Promptfoo Compatibility

**Verdict: Aligned. Use the native `anthropic:claude-agent-sdk` provider.**

Promptfoo has a first-class provider for the Claude Agent SDK (`anthropic:claude-agent-sdk`), announced as part of its Anthropic-first provider expansion. This means promptfoo can call the same `query()` path the package uses, with model injected externally — no custom `.ts` wrapper needed.

**Multi-model comparison config shape:**
```yaml
# promptfooconfig.yaml (at packages/code-reviewer/evals/)
providers:
  - id: anthropic:claude-agent-sdk
    label: sonnet-4-6
    config:
      model: claude-sonnet-4-6
      system: "You are a precise, constructive code reviewer..."  # or file:// ref
      outputFormat:
        type: json_schema
        schema: ...  # REVIEW_JSON_SCHEMA pasted inline
      maxTurns: 2
      maxBudgetUsd: 0.1

  - id: anthropic:claude-agent-sdk
    label: haiku-4-5
    config:
      model: claude-haiku-4-5-20251001
      # same system + outputFormat

  - id: anthropic:claude-agent-sdk
    label: opus-4-8
    config:
      model: claude-opus-4-8

prompts:
  - "Review this pull request:\n\n{{diff}}"

tests:
  - vars:
      diff: file://diffs/pr-001.diff
    assert:
      - type: is-json
      - type: javascript
        value: "['pass','fail'].includes(JSON.parse(output).verdict)"
      - type: javascript
        value: |
          const d = JSON.parse(output);
          return [d.implementationCorrectness, d.idiomaticity, d.complexity,
                  d.testRiskCoverage, d.securitySafety].every(n => n >= 1 && n <= 10);
      - type: llm-rubric
        value: "The verdict is proportionate to the diff changes. The summary gives actionable next steps."
```

**Custom TypeScript provider path** (use only if you need `reviewDiff()` business logic):
```typescript
// packages/code-reviewer/evals/providers/reviewer-provider.ts
import type { ApiProvider, ProviderResponse } from 'promptfoo';
import { reviewDiff } from '../../src/agent/reviewer.js';

export default class ReviewerProvider implements ApiProvider {
  constructor(private opts: { config?: { model?: string } } = {}) {}
  id() { return `reviewer-${this.opts.config?.model ?? 'default'}`; }
  async callApi(prompt: string, ctx: any): Promise<ProviderResponse> {
    const diff = ctx.vars?.diff as string;
    const result = await reviewDiff(diff, { model: this.opts.config?.model });
    return { output: JSON.stringify(result) };
  }
}
```
Requires `reviewDiff` to accept a `model` option (currently it doesn't).

**Key compatibility notes:**
- Promptfoo resolves TypeScript providers via its own internal transpiler — no separate `tsx` config needed
- ESM + cross-package imports work but require running `promptfoo eval` from the monorepo root so path aliases resolve
- Promptfoo was acquired by OpenAI in March 2026 but Anthropic support remains first-class; no deprecation signals

---

### 3. Assertions for Structured Output

Promptfoo assertion layering (cheapest to most expensive):

| Assertion type | What it checks | Cost |
|---|---|---|
| `is-json` | Syntactically valid JSON | Free |
| `javascript` | Field presence, type, range (e.g. score 1-10) | Free |
| `llm-rubric` | Semantic quality, verdict justification | ~$0.001/call |
| `g-eval` | Chain-of-thought rubric (better calibration) | ~$0.005/call |

For model comparison, `is-json` + `javascript` field checks establish baseline correctness. `llm-rubric` evaluates reasoning quality. The judge model can be set globally or per-assertion.

---

### 4. Alternative Eval Toolkits

| Tool | TS-native | Custom agent | LLM-as-judge | Truly OSS | ESM friction |
|---|---|---|---|---|---|
| **Evalite** | ✓ | ✓ | ✓ (scorers) | ✓ MIT | Zero — Vitest-based |
| **Braintrust** | ✓ | ✓ | ✓ (AutoEvals) | SDK only, cloud required | Low |
| **Langfuse** | ✓ (v4) | ✓ | ✓ | ✓ MIT, self-hostable | Low-Medium |
| **LangSmith** | ✓ | ✓ | ✓ | SDK only, SaaS | Medium |
| **vitest-evals** | ✓ | ✓ | ✓ | ✓ MIT | Zero |
| **Inspect AI** | ✗ Python | ✓ | ✓ | ✓ Apache 2.0 | High |
| **RAGAS** | ✗ Python | RAG-focused | ✓ | ✓ MIT | High |

**Evalite** (by Matt Pocock) is the strongest alternative to promptfoo for this project: Vitest-native, ESM-first, no cloud dependency, and your agent function is just a function you call inside a scorer. No infra, no API keys beyond Anthropic. Main gap vs. promptfoo: no built-in multi-provider comparison UI — you parameterize Vitest `describe` blocks yourself.

**Braintrust** is the best alternative if you need a persistent experiment tracking UI and aren't constrained by data residency (diffs leave your machine). Free Starter tier is sufficient for a 2-3 model comparison. `AutoEvals` provides off-the-shelf JSON validity and semantic scorers.

---

## Code References

- `packages/code-reviewer/src/common/review-schema.ts:3-7` — `SYSTEM_PROMPT` definition
- `packages/code-reviewer/src/common/review-schema.ts:11-21` — `REVIEW_SCHEMA` (Zod)
- `packages/code-reviewer/src/common/review-schema.ts:24` — `REVIEW_JSON_SCHEMA` (JSON Schema draft-07)
- `packages/code-reviewer/src/agent/reviewer.ts:17` — **hardcoded `model: "claude-sonnet-4-6"`** — must be parameterized for multi-model evals
- `packages/code-reviewer/src/agent/reviewer.ts:4-41` — `reviewDiff()` function — importable, no side effects beyond Claude API call
- `packages/code-reviewer/package.json:5-7` — `exports` field pointing to `.ts` source directly

## Architecture Insights

1. **SYSTEM_PROMPT is a plain string** — it's trivially reusable in any eval config, either inlined or via `file://` reference in promptfoo YAML.
2. **REVIEW_JSON_SCHEMA is a stable JSON Schema object** — can be copy-pasted directly into promptfoo's `outputFormat.schema` or used in `is-json` assertions.
3. **The `query()` call is the boundary** — the package wraps the Claude Agent SDK rather than the raw Anthropic API. promptfoo's native `anthropic:claude-agent-sdk` provider means this boundary is transparent.
4. **No build step means no compilation artifact to reference** — evals must either (a) use promptfoo's TS transpiler for custom providers, (b) use the native SDK provider and not import package code, or (c) use Evalite/Vitest which runs TS natively.

## Recommended Path

**Use promptfoo with the native `anthropic:claude-agent-sdk` provider.** This is the tech-stack-aligned path because:
- The package already uses claude-agent-sdk — promptfoo's native provider speaks the same protocol
- No custom provider needed for the primary use case (model comparison)
- `SYSTEM_PROMPT` and `REVIEW_JSON_SCHEMA` are directly reusable without importing package code
- LLM-as-judge and structured JSON assertions are built-in

**Before starting:** Add a `model` parameter to `reviewDiff()` so it can also be called from a custom provider if needed later. Even if you use the native provider for evals, the function should be configurable.

**File to create:** `packages/code-reviewer/evals/promptfooconfig.yaml` with 2 providers (haiku-4-5, sonnet-4-6), seed diffs in `evals/diffs/`, and assertions as described below.

## Answers to Open Questions (2026-06-26)

1. **Ground truth**: Human-labelled diffs with known verdicts are available. Use deterministic `javascript` assertions to match against expected verdict — no LLM-as-judge needed for correctness. This is free and more reliable.
2. **Budget**: ~$1 total. See Budget Plan below.
3. **CI**: Gate on PRs acceptable — at ~$0.25/run the cost is manageable. Use a `workflow_dispatch` trigger or label-based gate (e.g. `run-evals` label on PR) to avoid paying on every push.

## Budget Plan

The key insight with human labels: **verdict correctness is a free `javascript` assertion** — no LLM-as-judge call needed. Drop `llm-rubric` from the default assertion set; use it only as an optional check on summary quality if budget allows.

**Drop Opus from the comparison.** Haiku vs Sonnet is the meaningful comparison (quality vs cost). Opus at $0.05-0.15/call would eat the budget.

**Reduce `maxBudgetUsd` to `0.05` per call** (from the current 0.10 in `reviewer.ts`).

**Cost estimates (rough, based on typical small-to-medium diffs):**

| Model | Cost/call | 5 diffs | 10 diffs |
|---|---|---|---|
| claude-haiku-4-5 | ~$0.003 | ~$0.015 | ~$0.03 |
| claude-sonnet-4-6 | ~$0.02 | ~$0.10 | ~$0.20 |
| **Total (2 models)** | | **~$0.12** | **~$0.23** |

A 10-diff × 2-model run costs ~$0.25 — well under $1. You have headroom to add a third provider (e.g. a smaller model as a baseline) or run the suite several times while iterating on the system prompt, and stay within budget.

**Assertion strategy (budget-aware):**
```yaml
assert:
  # 1. Free structural checks
  - type: is-json
  - type: javascript
    value: "['pass','fail'].includes(JSON.parse(output).verdict)"
  # 2. Free ground-truth match (human labels)
  - type: javascript
    value: "JSON.parse(output).verdict === context.vars.expectedVerdict"
  # 3. Free score range validation
  - type: javascript
    value: |
      const d = JSON.parse(output);
      return [d.implementationCorrectness, d.idiomaticity, d.complexity,
              d.testRiskCoverage, d.securitySafety].every(n => n >= 1 && n <= 10);
  # 4. Optional: LLM-as-judge on summary quality (add if budget allows, ~$0.001/call)
  # - type: llm-rubric
  #   value: "The summary gives clear, actionable next steps relevant to the diff."
```

**Test case shape:**
```yaml
tests:
  - description: "simple refactor — expected pass"
    vars:
      diff: file://diffs/pr-refactor.diff
      expectedVerdict: pass
  - description: "SQL injection bug — expected fail"
    vars:
      diff: file://diffs/pr-sqli.diff
      expectedVerdict: fail
```
