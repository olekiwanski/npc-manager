---
project: npc-manager
checked_at: 2026-05-19T12:00:00Z
health_status: needs-attention
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 0
  moderate: 9
  low: 0
test_runner_detected: false
ci_provider: GitHub Actions
recommended_fixes: 5
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
```

### Security Audit

```
Tool: npm audit --json
Summary: 0 CRITICAL, 2 HIGH, 9 MODERATE, 0 LOW
Direct vs transitive: 1 direct HIGH (wrangler), 1 transitive HIGH (undici via miniflare/wrangler)
```

#### HIGH findings

- **wrangler** 3.107.3 — GHSA-36p8-mvp6-cv38: OS Command Injection in `wrangler pages deploy` via
  unsanitized deployment path argument (CWE-78). Affects wrangler >=2.0.15 <3.114.17.
  Fix: `npm install wrangler@3.114.17` (minimum safe patch) or `npm install wrangler@latest` (v4.x).

- **undici** (transitive via miniflare → wrangler) — GHSA-vrm6-8vpv-qv8q + GHSA-v9p9-hfj2-hcw8:
  Unbounded Memory Consumption in WebSocket permessage-deflate Decompression (CVSS 7.5) and
  Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits (CVSS 7.5).
  Affects undici <=6.23.0. Fix: resolved by updating wrangler to 3.114.17+ (see above).

MODERATE findings (9 total, log only):
- `esbuild` <=0.24.2 — development server cross-origin request disclosure (transitive via wrangler)
- `@astrojs/cloudflare` >=13.0.0 — chains through @cloudflare/vite-plugin vulnerabilities (transitive)
- `@cloudflare/vite-plugin`, `miniflare` — MODERATE range issues (transitive via wrangler/cloudflare)
- `ws` 8.0.0–8.20.0 — uninitialized memory disclosure (transitive via cloudflare-vite-plugin)
- `volar-service-yaml`, `yaml-language-server`, `yaml` <=2.8.2 — YAML stack overflow in deeply nested
  collections (transitive via @astrojs/language-server, dev-only)

### Outdated Dependencies

```
Packages with major version gaps: 5
```

Packages 1 major version behind (none are 2+ major versions behind):

- **eslint**: 9.39.4 → 10.4.0 (1 major)
- **@eslint/js**: 9.x → 10.x (1 major — aligns with eslint v10 upgrade)
- **lint-staged**: 16.x → 17.x (1 major)
- **typescript**: 5.9.3 → 6.0.3 (1 major — TypeScript 6 has breaking changes worth reviewing)
- **wrangler**: 3.107.3 → 4.93.0 (1 major — v3.114.17 also fixes the HIGH advisory if you prefer
  to stay on v3)

None exceed the 2-major-version threshold, but `wrangler` and `typescript` upgrades are worth
planning: wrangler v4 resolves the HIGH security advisory, and TypeScript 6 changes strictness
behavior in ways that may surface new errors in the codebase.

---

## Test Suite

```
Test runner: not detected
Tests found: not applicable
Test execution: not attempted
```

⚠ No test runner detected. The agent cannot verify its own changes.

No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` were found.
The `package.json` scripts include `dev`, `build`, `preview`, `lint`, and `format` — but no `test`
script.

Recommended: Install Vitest (idiomatic choice for Astro + Vite-based stacks):

```bash
npm init vitest@latest
```

Then add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml
```

| Stage      | Status | Notes                                                      |
|------------|--------|------------------------------------------------------------|
| Lint       | ✓      | `npm run lint` (ESLint via eslint.config.js)               |
| Test       | ✗      | No test step — no test runner configured yet               |
| Build      | ✓      | `npm run build` (Astro build with Cloudflare adapter)      |
| Type check | ✗      | No explicit `astro check` or `tsc --noEmit` step           |
| Security   | ✗      | No `npm audit` or equivalent scan step                     |

The CI pipeline runs lint and build on every push/PR to master. Type errors caught during build are
a partial substitute for an explicit type-check step, but `astro check` would surface errors in
`.astro` templates before the full build runs. A test step and security scan step are natural
additions once a test runner is in place — covered in the infrastructure lesson.

---

## Configuration

### High severity

All high-severity configuration is present:
- `tsconfig.json` extends `astro/tsconfigs/strict` — TypeScript strict mode effectively enabled ✓
- `.gitignore` present ✓

### Medium severity

All medium-severity configuration is present:
- `.prettierrc.json` — Prettier configured with Astro and Tailwind plugins ✓
- `eslint.config.js` — ESLint configured with TypeScript, React, and Astro plugins ✓

### Low severity

- **`.editorconfig`** — absent. Ensures consistent indentation and line endings across different
  editors and operating systems. Without it, contributors using different editors may introduce
  inconsistent whitespace. Fix: create a `.editorconfig` at the project root with your preferred
  indent style (`indent_style = space`, `indent_size = 2` is standard for this stack).
  Effort: quick (< 5 min).

---

## Stack Assessment Cross-Reference

```
No stack-assessment.md found. Run /10x-stack-assess for quality-gate analysis.
```

The `context/foundation/tech-stack.md` hand-off confirms this stack passed all four agent-friendly
quality gates (`bootstrapper_confidence: first-class`, `quality_override: false`). No stack
assessment cross-reference is available, but the tech-stack hand-off suggests no compensation
strategies are needed for type safety or convention coverage.

---

## Recommended Fixes

### Fix before agent work (Category A)

#### 1. Update wrangler to patch OS command injection

**Impact**: wrangler is a direct devDependency used in the Cloudflare Pages deployment workflow.
The OS command injection vulnerability (GHSA-36p8-mvp6-cv38) can be triggered during `wrangler pages deploy`.
Updating also resolves the transitive undici HIGH findings.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**:

```bash
# Minimum safe fix (stay on v3):
npm install wrangler@3.114.17

# Recommended (move to v4 — also fixes eslint/minor deps as part of peer resolution):
npm install wrangler@latest
```

After updating, re-run `npm audit` to confirm HIGH findings clear.

---

#### 2. Set up a test runner (Vitest)

**Impact**: Without a test runner, the agent cannot verify whether its changes break existing
behaviour. Every agent-generated edit goes unverified, increasing the risk of regressions
accumulating silently. This is the highest-leverage improvement for agent collaboration.
**Severity**: high (agent workflow)
**Effort**: moderate (15–30 min)
**Fix**:

```bash
# Scaffold Vitest configuration:
npm init vitest@latest

# Add test scripts to package.json manually if the init does not:
# "test": "vitest run",
# "test:watch": "vitest"
```

Start with at least one smoke test per feature area (auth flows, NPC CRUD, AI reaction route) so
the agent has a verification target for each major concern in the PRD.

---

#### 3. Plan the major-version dependency upgrades

**Impact**: Running behind major versions — especially `eslint` v10 and `typescript` v6 — means the
agent may generate code valid for the old API that breaks when you upgrade later. Catching
breakage now, before AI-generated code accumulates, is far cheaper than after.
**Severity**: medium
**Effort**: moderate (15–30 min per major)
**Fix**:

```bash
# Update wrangler to v4 (also resolves HIGH advisory — see fix #1):
npm install wrangler@latest

# Update TypeScript (read the v6 migration guide first — strictness changes):
npm install typescript@latest

# Update eslint + @eslint/js to v10 together (they version in lockstep):
npm install eslint@latest @eslint/js@latest

# Update lint-staged to v17:
npm install lint-staged@latest
```

Run `npm run lint` and `npm run build` after each upgrade to catch breakage early. TypeScript 6
and ESLint 10 both have documented breaking changes worth reviewing before upgrading.

---

#### 4. Add an explicit type-check step to CI

**Impact**: The current CI build catches type errors only as a side effect of `npm run build`.
`astro check` surfaces type errors in `.astro` template files before the full build, giving faster
feedback. With an agent writing `.astro` files, early type feedback matters.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

Add the following step to `.github/workflows/ci.yml` between the lint and build steps:

```yaml
- run: npx astro check
```

This runs the Astro language server type check, covering both TypeScript and `.astro` template types.

---

#### 5. Add a `.editorconfig` file

**Impact**: Low-urgency convenience — ensures any tool or editor the agent spawns (or future
contributors use) writes consistent indentation and line endings without extra configuration.
**Severity**: low
**Effort**: quick (< 5 min)
**Fix**:

Create `.editorconfig` at the project root:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

---

### Addressed in upcoming lessons (Category B)

#### Missing test step in CI

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: Once the test runner is in place (Category A fix #2 above), you'll add a
`npm test` step to the CI pipeline alongside the security scan and deployment configuration.

#### Missing security scan in CI

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: You'll add `npm audit --audit-level=high` or a Dependabot/GitHub security
scanning configuration to the CI pipeline as part of the infrastructure setup.

#### Missing AGENTS.md

**Lesson**: [Agent Onboarding: Agents.md, AI Rules i feedback loops (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4)
**What you'll do there**: Agent onboarding walks you through building `AGENTS.md` with the right
project-specific rules, routing conventions, and feedback loops. Generating a stub now would be
premature — the content matters as much as the file's existence.

---

## Summary

Health status: needs-attention

The npc-manager project has a solid foundation for agent-assisted development: TypeScript strict mode
is active via Astro's preset, ESLint and Prettier are fully configured with Astro and React plugins,
Husky + lint-staged enforces quality on commit, a `package-lock.json` pins all dependencies, and a
GitHub Actions pipeline covers lint and build on every push. The two gaps that need attention before
agent work begins are (1) a HIGH-severity OS command injection in `wrangler` that takes under five
minutes to patch, and (2) the absence of any test runner — without tests, the agent has no way to
verify that its changes work correctly.

Next step: Run `npm install wrangler@3.114.17` to clear the HIGH security advisory, then run
`npm init vitest@latest` and write a first suite of smoke tests before starting agent-assisted
feature development.
