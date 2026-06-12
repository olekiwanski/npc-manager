---
change_id: testing-streaming-context
title: Test Phase 2 — Streaming and context correctness (risks #3, #4)
status: implementing
created: 2026-06-12
updated: 2026-06-12

archived_at: null
---

## Notes

Open a change folder for rollout Phase 2 of context/foundation/test-plan.md: "Streaming and context correctness".
Risks covered: #3 (SSE streaming fragmentation — naive line-split parser loses or corrupts content when a frame arrives across two TCP reads), #4 (NPC context silently absent from Claude call — nullable-field regression or roster-lookup failure produces a minimal system prompt).
Test types planned: unit, component-level (mocked fetch).
Risk response intent:
- Risk #3: prove that when a response chunk is split mid-data line, accumulated text is complete and error state is not triggered; challenge "Cloudflare Workers always flushes complete frames"; avoid testing only with complete single-frame chunks (the happy path).
- Risk #4: prove that the Anthropic client is called with a non-empty system parameter containing NPC name and role for a fully-populated NPC; challenge "buildNpcSystemPrompt unit tests prove the route works — they prove the function, not that the route passes its output correctly"; avoid asserting AI response content (non-deterministic oracle).
