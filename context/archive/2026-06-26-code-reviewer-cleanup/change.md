---
id: code-reviewer-cleanup
title: Fix SDK API mismatch and translate strings in packages/code-reviewer
status: archived
created: 2026-06-26
updated: 2026-06-26
archived_at: 2026-06-26T08:12:48Z
---

Fixes a bug where reviewer.ts accesses a non-existent `message.errors` array,
adds the missing `maxBudgetUsd` cost cap, and translates all Polish strings to
English for consistency with the rebuilt English SKILL.md.
