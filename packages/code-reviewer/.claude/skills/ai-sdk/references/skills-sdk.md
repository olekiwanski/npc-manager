# Agent Skills in the SDK

Source: https://code.claude.com/docs/en/agent-sdk/skills
Fetched: 2026-06-26

---

## How Skills Work with the SDK

1. **Filesystem artifacts** — `SKILL.md` files in `.claude/skills/<name>/`
2. **Loaded from filesystem** — governed by `settingSources` option
3. **Automatically discovered** — at startup from user and project directories
4. **Model-invoked** — Claude autonomously chooses when to use them
5. **Filtered via `skills` option** — pass `"all"`, a name list, or `[]` to control availability

> Unlike subagents (which can be defined programmatically), **Skills must be created as filesystem artifacts**. There is no programmatic API for registering skills.

---

## Enabling Skills in `query()`

```typescript
for await (const message of query({
  prompt: "...",
  options: {
    cwd: "/path/to/project",           // must contain .claude/skills/
    settingSources: ["user", "project"], // required for skill discovery
    skills: "all",                      // or ["skill-name"]
    allowedTools: ["Read", "Bash"]
  }
})) { ... }
```

- `skills: "all"` — enable every discovered skill
- `skills: ["pdf", "docx"]` — enable only those specific skills (matched by `name` field in frontmatter or directory name)
- `skills: []` — disable all skills
- When `skills` is set, the SDK automatically adds the `Skill` tool to `allowedTools`

---

## Skill Locations

| Directory | `settingSources` required | Shared? |
|-----------|--------------------------|---------|
| `.claude/skills/` in `cwd` or parent dirs | `"project"` | Yes (git) |
| `~/.claude/skills/` | `"user"` | Personal |

If `settingSources` is set explicitly and omits `"user"` and `"project"`, skills are not discovered.

---

## `SKILL.md` Format

```markdown
---
name: skill-name
description: One-line description — Claude uses this to decide when to invoke the skill
---

Skill content: instructions, examples, reference material...
```

The `description` field is critical — it determines when Claude autonomously invokes the skill.

### Important: `allowed-tools` frontmatter

> **`allowed-tools` frontmatter is only supported in the Claude Code CLI. It does NOT apply when using the SDK.**

In the SDK, control tool access via the main `allowedTools` option in `query()`:

```typescript
options: {
  settingSources: ["user", "project"],
  skills: "all",
  allowedTools: ["Read", "Grep", "Glob"],  // controls ALL tool access, including within skills
  permissionMode: "dontAsk"                 // deny anything not in allowedTools
}
```

---

## Troubleshooting: Skills Not Found

**Check `settingSources`** — skills require `"user"` or `"project"` to be loaded:

```typescript
// Skills NOT loaded:
{ settingSources: [], skills: "all" }

// Skills loaded:
{ settingSources: ["user", "project"], skills: "all" }
```

**Check `cwd`** — SDK loads skills from `.claude/skills/` in `cwd` and every parent directory up to the repository root.

**Check filesystem**:
```bash
ls .claude/skills/*/SKILL.md
ls ~/.claude/skills/*/SKILL.md
```

---

## Default `settingSources` Behavior

With default (no explicit `settingSources`), the SDK loads from all sources: user, project, and local. Skills in `~/.claude/skills/`, `<cwd>/.claude/skills/`, and `.claude/skills/` in any parent directory up to the repository root are automatically discovered.
