# code-reviewer-cleanup — Plan Brief

> Full plan: `context/changes/code-reviewer-cleanup/plan.md`

## What & Why

Fix a runtime bug in `packages/code-reviewer` where `reviewer.ts` accesses `message.errors` — a field that doesn't exist on the SDK's error result type — and clean up all Polish strings to match the English SKILL.md that was just rebuilt from official docs.

## Starting Point

Three source files: `reviewer.ts` (agent logic), `review-schema.ts` (Zod schema + system prompt), `index.ts` (thin CLI). The modular structure is already in place. The bugs were discovered by comparing the code against the accurate SDK types in the new SKILL.md.

## Desired End State

All three files are in English, `message.result` is used for error messages, `maxBudgetUsd: 0.10` is set as a cost cap, and a live `git diff | npx tsx src/index.ts` run returns a valid English-language JSON review.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Error field | `message.result` | Always present on non-success; `errors[]` doesn't exist | Plan |
| Budget cap | `$0.10` | Matches SKILL.md example; 2-4x typical cost, safe headroom | Plan |
| Model strings language | English | Full consistency with SKILL.md; model performs equally in either language | Plan |
| Error format | `Review failed (${subtype}): ${message.result}` | Subtype identifies the failure mode for CI/logging | Plan |
| Verification | Live agent run | Proves the API fix and translations are correct end-to-end | Plan |

## Scope

**In scope:** `reviewer.ts` bug fix, `maxBudgetUsd`, translation of all 3 source files

**Out of scope:** Promptfoo eval setup, session resumption, schema field name changes, new features

## Architecture / Approach

Two sequential phases touching one file each (Phase 1: `reviewer.ts`, Phase 2: `review-schema.ts` + `index.ts`). No new dependencies. No structural changes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Fix reviewer.ts | API bug fix + maxBudgetUsd + English log/prompt strings | Minimal — straightforward field name change |
| 2. Translate schemas + CLI | English SYSTEM_PROMPT, .describe() strings, CLI message + live verification | Prompt translation must preserve evaluation criteria |

**Prerequisites:** `ANTHROPIC_API_KEY` set locally for the Phase 2 live run
**Estimated effort:** ~1 session, 2 small phases

## Open Risks & Assumptions

- `SDKResultError` type is not fully documented — `message.result` is the safe fallback (always present)
- Polish review summaries produced by the old prompt will become English — any stored/cached outputs will differ in language

## Success Criteria (Summary)

- No Polish strings in any source file
- `git diff HEAD~1 | npx tsx packages/code-reviewer/src/index.ts` returns valid JSON with English `summary`
- Stderr shows `[info] cost: $X | turns: N`
