---
name: ai-sdk
description: Claude Agent SDK (@anthropic-ai/claude-agent-sdk) reference for this package — query(), options, message types, structured output, permissions, sessions, and skills.
---

The `packages/code-reviewer` package uses `@anthropic-ai/claude-agent-sdk` v0.3+.
Full API docs: `references/api-typescript.md`. Skills integration: `references/skills-sdk.md`.

---

## Core Pattern

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({ prompt, options })) {
  if (message.type !== "result") continue;
  if (message.subtype === "success") {
    // handle result
  } else {
    // subtype: "error" | "interrupted" | "limit_exceeded" | "no_response"
  }
}
```

---

## Pattern Used in This Package (`src/agent/reviewer.ts`)

```typescript
const result = query({
  prompt: `Review this diff:\n\n${diff}`,
  options: {
    systemPrompt: SYSTEM_PROMPT,
    model: "claude-sonnet-4-6",
    tools: [],        // no built-in tools — reasoning only
    maxTurns: 2,
    outputFormat: { type: "json_schema", schema: REVIEW_JSON_SCHEMA },
  },
});

for await (const message of result) {
  if (message.type !== "result") continue;
  if (message.subtype === "success") {
    const parsed = REVIEW_SCHEMA.safeParse(message.structured_output);
    if (!parsed.success) throw new Error(`Invalid output: ${parsed.error.message}`);
    console.error(`[info] cost: $${message.total_cost_usd.toFixed(6)} | turns: ${message.num_turns}`);
    return parsed.data;
  }
  throw new Error(`Review failed (${message.subtype}): ${message.result}`);
}
```

---

## Key Options

```typescript
options: {
  systemPrompt: string,      // custom system prompt
  model: "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" | "claude-opus-4-8",
  tools: [],                 // restrict available tools; [] = reasoning only
  allowedTools: ["Read"],    // pre-approve specific tools without prompting
  maxTurns: 2,               // max tool-use round trips
  maxBudgetUsd: 0.10,        // hard cost cap; stops with subtype "limit_exceeded"
  permissionMode: "dontAsk", // see permission modes below
  resume: sessionId,         // resume a previous session by ID
  outputFormat: {
    type: "json_schema",
    schema: JSONSchema,      // must be draft-07 (see structured output below)
  },
  settingSources: ["user", "project"], // which filesystem settings to load (skills, CLAUDE.md)
  skills: "all",             // or ["skill-name"] or []
}
```

---

## Structured Output

Requires `outputFormat` option. The SDK validates internally, but `structured_output` is typed as `unknown` — always validate with Zod:

```typescript
const parsed = REVIEW_SCHEMA.safeParse(message.structured_output);
if (!parsed.success) throw new Error(parsed.error.message);
return parsed.data; // now typed as Review
```

**Draft-07 required** — Zod 4 defaults to draft-2020-12, which the SDK rejects:

```typescript
// Correct
const REVIEW_JSON_SCHEMA = z.toJSONSchema(REVIEW_SCHEMA, { target: "draft-07" });

// Wrong — SDK rejects draft-2020-12
const REVIEW_JSON_SCHEMA = z.toJSONSchema(REVIEW_SCHEMA);
```

---

## Permission Modes

| Mode | Behavior |
|------|----------|
| `"default"` | Requires `canUseTool` callback for each tool call |
| `"acceptEdits"` | Auto-approve file edits and common filesystem ops |
| `"dontAsk"` | Deny anything not in `allowedTools` (good for headless agents) |
| `"bypassPermissions"` | Run every tool without prompting (sandboxed CI only) |
| `"auto"` | Model classifier approves/denies each call (TypeScript only) |
| `"plan"` | Explore without editing |

For a read-only diff reviewer with `tools: []`, `permissionMode` is not needed — no tools to approve.

---

## Authentication

| Environment | How it works |
|-------------|--------------|
| Local dev | Uses active Claude Code session credentials — no key needed |
| CI / production | Requires `ANTHROPIC_API_KEY` environment variable |
| Bedrock | `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials |
| Vertex AI | `CLAUDE_CODE_USE_VERTEX=1` + GCP credentials |
| Azure | `CLAUDE_CODE_USE_FOUNDRY=1` + Azure credentials |

> Anthropic does not allow offering claude.ai login to third-party users. Use API key auth for any agent you distribute.

---

## Cost Tracking

```typescript
// Hard limit — agent stops with subtype "limit_exceeded"
options: { maxBudgetUsd: 0.10 }

// After a successful run
message.total_cost_usd    // total cost for this query()
message.modelUsage        // per-model breakdown (useful with subagents)
```

Typical cost: `claude-sonnet-4-6`, 2 turns, ~100-line diff → **$0.01–$0.04**.

---

## Session Resumption

```typescript
// Run 1 — capture session_id from system init message
let sessionId: string | undefined;
for await (const msg of query({ prompt, options })) {
  if (msg.type === "system" && msg.subtype === "init") sessionId = msg.session_id;
  // ...handle result
}

// Run 2 — resume with full context (agent "remembers" previous diff and analysis)
query({
  prompt: "Author applied fixes. Do they address your concerns?",
  options: { ...options, resume: sessionId },
});
```

`reviewer.ts` does not currently implement resumption — each run is independent.

---

## Skills Integration

To load CLAUDE.md, skills, and other filesystem settings:

```typescript
options: {
  settingSources: ["user", "project"], // required — skills not discovered without this
  skills: "all",                        // or ["ai-sdk"] to enable only this skill
  cwd: "/path/to/packages/code-reviewer"
}
```

See `references/skills-sdk.md` for full details on skill discovery and `SKILL.md` authoring.
