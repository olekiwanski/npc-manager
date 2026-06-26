# Claude Agent SDK — TypeScript API Reference

Source: https://code.claude.com/docs/en/agent-sdk/typescript
Fetched: 2026-06-26

---

## `query()` Function

```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

Returns a `Query` object extending `AsyncGenerator<SDKMessage, void>`.

---

## Options — Complete Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `allowedTools` | `string[]` | `[]` | Tools to auto-approve without prompting |
| `betas` | `SdkBeta[]` | `[]` | Enable beta features |
| `canUseTool` | `CanUseTool` | `undefined` | Custom permission function per tool call |
| `continue` | `boolean` | `false` | Continue the most recent conversation |
| `cwd` | `string` | `process.cwd()` | Working directory; Claude can access files here |
| `disallowedTools` | `string[]` | `[]` | Tools to always deny |
| `effort` | `'low'\|'medium'\|'high'\|'xhigh'\|'max'` | model default | Thinking effort level |
| `enableFileCheckpointing` | `boolean` | `false` | Enable file change tracking for rewinding |
| `env` | `Record<string, string\|undefined>` | `process.env` | Environment variables |
| `fallbackModel` | `string` | `undefined` | Model to use if primary fails |
| `forkSession` | `boolean` | `false` | Fork to new session ID instead of continuing |
| `hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` | `{}` | Hook callbacks for agent lifecycle events |
| `maxBudgetUsd` | `number` | `undefined` | Stop when cost estimate reaches this USD value |
| `maxTurns` | `number` | `undefined` | Maximum agentic turns (tool-use round trips) |
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP server configurations |
| `model` | `string` | CLI default | Claude model alias or full model name |
| `outputFormat` | `{ type: 'json_schema', schema: JSONSchema }` | `undefined` | Structured output format |
| `permissionMode` | `PermissionMode` | `'default'` | Permission mode for the session |
| `resume` | `string` | `undefined` | Session ID to resume |
| `settingSources` | `SettingSource[]` | all sources | Which filesystem settings to load |
| `skills` | `string[] \| 'all'` | `undefined` | Skills available to the session |
| `systemPrompt` | `string \| { type: 'preset'; preset: 'claude_code'; append?: string }` | `undefined` | System prompt |
| `tools` | `string[] \| { type: 'preset'; preset: 'claude_code' }` | `undefined` | Available tools (restricts the tool set) |
| `agents` | `Record<string, AgentDefinition>` | `undefined` | Programmatically defined subagents |

---

## PermissionMode

```typescript
type PermissionMode =
  | "default"           // Requires canUseTool callback for approval
  | "acceptEdits"       // Auto-approve file edits and common filesystem ops
  | "bypassPermissions" // Run every tool without prompting (sandboxed CI)
  | "plan"              // Explore without editing
  | "dontAsk"           // Deny anything not in allowedTools
  | "auto";             // Model classifier approves/denies each call (TypeScript only)
```

---

## SettingSource

```typescript
type SettingSource = "user" | "project" | "local";
```

| Value | Location | Description |
|-------|----------|-------------|
| `"user"` | `~/.claude/settings.json` | Global user settings |
| `"project"` | `.claude/settings.json` | Shared project settings (version controlled) |
| `"local"` | `.claude/settings.local.json` | Local project settings (not version controlled) |

**Default**: all sources loaded. Skills are discovered from `settingSources` — if you set this explicitly and omit `"user"` and `"project"`, skills won't be found.

---

## Message Types — SDKMessage Union

### `SDKResultMessage` (success)

```typescript
{
  type: "result";
  subtype: "success";
  uuid: string;
  session_id: string;
  duration_ms: number;
  num_turns: number;
  result: string;                    // text summary
  total_cost_usd: number;
  usage: NonNullableUsage;           // { input_tokens, output_tokens, ... }
  modelUsage: { [model: string]: ModelUsage };
  structured_output?: unknown;       // present when outputFormat was set; always validate
  permission_denials: SDKPermissionDenial[];
}
```

### `SDKResultMessage` (error/interrupted)

```typescript
{
  type: "result";
  subtype: "error" | "interrupted" | "limit_exceeded" | "no_response";
  uuid: string;
  session_id: string;
  duration_ms: number;
  result: string;
  error?: SDKResultError;
}
```

### `SDKAssistantMessage`

```typescript
{
  type: "assistant";
  uuid: string;
  session_id: string;
  message: BetaMessage;               // from Anthropic SDK
  parent_tool_use_id: string | null;
}
```

### `SDKSystemMessage` (init)

```typescript
{
  type: "system";
  subtype: "init";
  session_id: string;
  // Capture session_id here to resume later
}
```

---

## Query Object — Additional Methods

```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  rewindFiles(userMessageId: string, options?: { dryRun?: boolean }): Promise<RewindFilesResult>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  close(): void;
  // + other control methods
}
```

---

## `CanUseTool` Callback

```typescript
type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: { signal: AbortSignal; toolUseID: string; }
) => Promise<
  | { behavior: "allow"; updatedInput?: Record<string, unknown> }
  | { behavior: "deny"; message: string }
>;
```

Used with `permissionMode: "default"` to implement custom approval logic.

---

## Hooks

```typescript
options: {
  hooks: {
    PostToolUse: [{ matcher: "Edit|Write", hooks: [logFileChange] }]
  }
}

type HookCallback = (input: unknown) => Promise<{}>;
```

Available hook events: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`.

---

## Subagents

```typescript
options: {
  allowedTools: ["Read", "Glob", "Agent"],
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer.",
      prompt: "Analyze code quality and suggest improvements.",
      tools: ["Read", "Glob", "Grep"]
    }
  }
}
```

Subagent messages include `parent_tool_use_id` to identify which subagent produced them.

---

## MCP Servers

```typescript
options: {
  mcpServers: {
    playwright: { command: "npx", args: ["@playwright/mcp@latest"] }
  }
}
```
