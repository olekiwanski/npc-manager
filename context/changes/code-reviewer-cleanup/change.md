---
id: code-reviewer-cleanup
title: Fix SDK API mismatch and translate strings in packages/code-reviewer
status: implemented
updated: 2026-06-26
---

Fixes a bug where reviewer.ts accesses a non-existent `message.errors` array,
adds the missing `maxBudgetUsd` cost cap, and translates all Polish strings to
English for consistency with the rebuilt English SKILL.md.
