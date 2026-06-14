# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-12

---

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic check that already catches the
   regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface in \<area\>" carry the
   same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase signal (churn, structure, test base). It does NOT
   claim to know which line owns the failure. That knowledge is produced by
   `/10x-research` during each rollout phase. If the plan and research
   disagree about where the failure lives, research is the ground truth.

**Constraint:** all tests must be fully mocked — no real Supabase connections,
no Cloudflare Workers deployment. This is a deliberate project constraint
(Phase 2 interview Q5) that applies to every rollout phase.

**E2E exception (Phase 4):** E2E tests run against the local dev server with
real Supabase auth. This is the only exception — E2E cannot mock away the
running app. Requires `npx supabase start` and `.dev.vars` with local
credentials. `TEST_EMAIL` / `TEST_PASSWORD` env vars identify the test account.

Hot-spot scope used for likelihood weighting: `src/` (18 commits / 30d).
Top directories: `src/components/npcs` (11), `src/components/campaigns` (11),
`src/lib` (7), `src/pages/campaigns/[id]/npcs/[npcId]` (6),
`src/pages/api/auth` (4), `src/pages/api/npcs/[id]` (2).

---

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | Scenario input validation regresses — empty or >500-char scenario bypasses Zod and reaches the Anthropic SDK, enabling off-topic completions and API cost abuse | High | Medium | Interview Q1; AGENTS.md (Zod required on all API routes); roadmap S-04 plan notes |
| 2 | Auth/ownership bypass on the reaction endpoint — unauthenticated request or cross-user NPC ID not rejected; another user's NPC profile and relationships leak as Claude context (IDOR via AI proxy) | High | Medium | Interview Q3, Q4; PRD Access Control guardrail ("no cross-account data access"); roadmap F-01 risk note |
| 3 | SSE streaming fragmentation — naive line-split parser loses or corrupts content when a frame arrives across two TCP reads; GM sees truncated output with no error signal | Medium | Low-Medium | Interview Q3; roadmap S-04 plan (explicitly flagged as MVP tradeoff); hot-spot dir `src/components/npcs` (11 commits/30d) |
| 4 | NPC context silently absent from Claude call — nullable-field regression or roster-lookup failure produces a minimal system prompt; GM receives a generic response indistinguishable from an in-character one | Medium | Low | PRD US-01 ("response references NPC's role, traits, and known relationships"); roadmap S-04 Phase 2 (unit tests cover nulls but no route-level integration) |
| 5 | Missing ANTHROPIC_API_KEY causes unhandled runtime crash — the key is optional in the Astro env schema (to pass CI without the secret); if absent from the deployment environment, the route throws instead of returning a clean 503 | Medium | Low-Medium | Roadmap S-04 Phase 1 (env schema design note); hot-spot dir `src/pages/api/npcs/[id]` (2 commits/30d) |
| 6 | Unauthenticated browser request to a protected route (`/dashboard`, `/campaigns`) reaches page content instead of redirecting to `/auth/signin` — middleware redirect is only tested at unit level; actual browser redirect (URL change, page content) is untested | Medium | Low | `src/middleware.ts` PROTECTED_ROUTES; unit tests mock the redirect but don't fire a real HTTP request |
| 7 | Sign-in form with valid credentials does not redirect to `/dashboard` — the full auth loop (form submit → Supabase auth → session cookie → middleware → redirect) is never exercised end-to-end | High | Low | PRD auth requirements; `src/pages/api/auth/signin.ts`; `src/middleware.ts` |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | API returns 400 for empty scenario, 400 for scenario >500 chars, 400 for missing `scenario` key | "Zod is wired, so it works" — validation may not be applied to the parsed body path or the right content-type | How the route parses the request body; whether Zod fires before or after other guards | Unit/integration — mock APIContext, no DB | Testing only the happy path; must verify invalid inputs are rejected |
| #2 | Unauthenticated request → 401; authenticated request with another user's NPC ID → 404 | "The ownership check runs" — the NPC query may filter by ID only, not by user_id | Whether the NPC query includes both ID and user_id filter; how `locals.user` is populated by middleware | Unit/integration — mock Supabase responses and `locals.user` | Only testing valid user/valid NPC; must test cross-user NPC ID |
| #3 | When a response chunk is split mid-data line, accumulated text is complete and error state is not triggered | "Cloudflare Workers always flushes complete frames" — true under normal conditions, not under backpressure | The SSE parsing loop implementation; whether lines are buffered across chunk boundaries | Unit — mock ReadableStream with fragmented chunks | Only testing with complete single-frame chunks (the happy path) |
| #4 | Anthropic client is called with a non-empty `system` parameter containing NPC name and role for a fully-populated NPC | "buildNpcSystemPrompt unit tests prove the route works" — they prove the function, not that the route passes its output correctly | Where and how the route passes the system prompt to the Anthropic client | Unit/integration — mock Anthropic client, capture call args | Asserting AI response content (non-deterministic oracle — assertions would mirror production logic) |
| #5 | When ANTHROPIC_API_KEY is undefined at runtime, route returns 503 with error body (no unhandled crash/500) | "optional: true means graceful degradation" — it means the build passes; runtime behavior depends on the code | Whether the route has an explicit undefined check before calling the SDK | Unit — mock the Astro env module to return undefined | Only testing that `npm run build` passes without the key |
| #6 | Visiting `/dashboard` or `/campaigns` as unauthenticated user → browser URL changes to `/auth/signin`; sign-in heading visible | "The middleware redirects" — unit test mocks the request; real browser may differ | How the middleware response reaches the browser as a 302/redirect | E2E — `waitForURL('**/auth/signin')` + `getByRole('heading', { name: 'Sign in' })` | Only testing at unit level with mocked request; must fire real browser request |
| #7 | Fill `Email` + `Password` with valid credentials, click `Sign in` → `waitForURL('**/campaigns')`; campaigns heading visible; `playwright/.auth/user.json` contains valid session | "Supabase handles auth so it works" — integration between API route, cookie setting, middleware, and redirect is untested | How `src/pages/api/auth/signin.ts` sets the session cookie and how middleware reads it | E2E — real Supabase required; `getByLabel` + `getByRole` + `waitForURL` | Testing only the Supabase SDK in isolation; must test the full browser loop |

---

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | API route integrity | Prove the /reaction endpoint rejects invalid inputs, unauthorized access, and missing env key — all via mocked Vitest tests | #1, #2, #5 | unit/integration (vi.mock) | complete | reaction-api-integrity |
| 2 | Streaming and context correctness | Prove the SSE parser handles fragmented chunks and the Anthropic client receives the correct system prompt | #3, #4 | unit, component-level (mocked fetch) | complete | testing-streaming-context |
| 3 | CI test gate | Add `npm run test` to the CI workflow so no regression can ship without tests running | #1–#5 | CI configuration | complete | testing-ci-gate |
| 4 | Browser auth and routing E2E | Prove the middleware redirect and sign-in flow work in a real browser | #6, #7 | e2e (Playwright, Chromium) | complete | browser-auth-routing-e2e |

**Status vocabulary** (parser literals):
`not started` → `change opened` → `researched` → `planned` → `implementing` → `complete`

---

## 4. Stack

The classic test base for this project. No e2e layer exists or is planned for this rollout — the user excluded Cloudflare and Supabase integration tests.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | ^4.1.6 | Node env by default; `// @vitest-environment jsdom` directive per file for React components |
| component (UI) | @testing-library/react | ^16.3.2 | jsdom env; existing pattern in `src/components/**/*.test.tsx` |
| module mocking | vi.mock() (Vitest built-in) | — | Used to mock Supabase client, Anthropic SDK, and astro:env/server across all phases |
| e2e | @playwright/test | ^1.60.0 | Chromium; storageState for auth; requires `npx supabase start` + `.dev.vars`; see §1 E2E exception |
| AI-native | none | — | Not warranted; all risks are addressable at the unit/integration layer cheaply |

**Stack grounding tools (current session):**
- Docs: Context7 available — will validate Vitest mocking patterns, Astro virtual module mocking, @testing-library/react streaming test setup; checked: 2026-06-08
- Search: Exa.ai available — for current tool status and Vitest 4.x migration notes if needed; checked: 2026-06-08
- Runtime/browser: none available in current session
- Provider/platform: none — no GitHub/Cloudflare/Supabase MCPs in this session

---

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required (CI already runs this) | type drift, style violations |
| unit + integration | local + CI | required (CI runs this) | logic regressions, auth bypasses, validation gaps |
| pre-commit hook | local | required (husky + lint-staged already wired) | lint and format regressions at commit time |
| e2e on critical flows | local (manual / pre-push) | Phase 4 — not yet required | browser auth and routing regressions |
| visual diff / multimodal review | — | not planned for this rollout | — |

---

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test for a pure function (lib/)

- **Location**: co-located with source as `src/lib/<module>.test.ts`
- **Naming**: `<module>.test.ts`
- **Reference test**: `src/lib/npc-reaction.test.ts` (8 cases for nullable-field branches)
- **Run locally**: `npm run test` or `vitest run src/lib/<module>.test.ts`

### 6.2 Adding an integration test for an API route

- **Location**: co-located with source as `src/pages/api/npcs/[id]/<route>.test.ts`
- **Reference tests**: `src/pages/api/npcs/[id]/reaction.test.ts` (5 cases — validation + auth/IDOR) and `reaction.missing-key.test.ts` (1 case — absent env key)
- **Run locally**: `npm run test` or `vitest run src/pages/api/npcs/[id]/reaction.test.ts`

**Three required `vi.mock` calls** (must appear at file top — Vitest hoists them before imports run):

```typescript
vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: "test-key",   // set to undefined in a separate file to test the missing-key guard
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { stream: vi.fn() } })),
}));
```

> **Caveat:** `stream: vi.fn()` returns `undefined` by default. If a test reaches the `for await (const event of stream)` call in the route, it will throw `TypeError: stream is not iterable`. For tests that need to exercise the streaming path, `stream` must return an async iterable — see §6.3 when completed for the streaming mock pattern.

**`makeSupabaseMock()` chain pattern** — call in `beforeEach` to get a fresh object per test:

```typescript
function makeSupabaseMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}
```

**`makeContext(overrides)` helper shape**:

```typescript
function makeContext(overrides: { user?: Partial<User> | null; npcId?: string; body?: unknown }) {
  return {
    locals: { user: overrides.user ?? null },
    request: new Request("http://localhost/api/npcs/npc-1/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrides.body ?? { scenario: "The party confronts the merchant." }),
    }),
    cookies: { set: vi.fn(), get: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
    params: { id: overrides.npcId ?? "npc-1" },
  };
}
```

**Call the handler with a double-cast** (required — partial mock does not structurally satisfy `APIContext`):

```typescript
await POST(makeContext({ ... }) as unknown as Parameters<typeof POST>[0])
```

**Separate file for `ANTHROPIC_API_KEY: undefined` tests.** `vi.mock` is hoisted for the entire file, so overriding the key to `undefined` in the same file as the auth tests would affect all tests. Put any test that requires the missing-key guard in its own file (e.g., `<route>.missing-key.test.ts`) with its own `vi.mock("astro:env/server", ...)` returning `ANTHROPIC_API_KEY: undefined`.

### 6.3 Adding a streaming component test

- **Location**: co-located with source as `src/components/npcs/NpcReaction.test.tsx`
- **Reference test**: `src/components/npcs/NpcReaction.test.tsx` (2 cases — fragmented chunk and single-chunk non-regression anchor)
- **Run locally**: `npm run test` or `vitest run src/components/npcs/NpcReaction.test.tsx`

**Required file directive** — must be the very first line:

```typescript
// @vitest-environment jsdom
```

**`fetch` stub setup** — pattern from `NpcList.test.tsx`:

```typescript
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
```

**`makeFragmentedStream` helper** — pass an array of string chunks; each is enqueued on successive `pull` calls:

```typescript
function makeFragmentedStream(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}
```

**Wire `fetchMock`** to return a response with the stream as the body:

```typescript
fetchMock.mockResolvedValueOnce({
  ok: true,
  status: 200,
  body: makeFragmentedStream([...chunks...]),
});
```

**SSE frame format** used by the route: `data: ${JSON.stringify({ text })}\n\n` for text events and `data: [DONE]\n\n` as the terminal frame. To simulate fragmentation, split a single frame string across two array entries.

**Assertion pattern** — use `screen.findByText` (async, equivalent to `waitFor` + `getByText`):

```typescript
await screen.findByText("expected accumulated text");
expect(screen.queryByText(/network error/i)).toBeNull();
```

**Component props**: `NpcReaction` takes `{ npcId: string }`. Render with `render(<NpcReaction npcId="npc-1" />)`, then interact via `fireEvent.change` on the textarea and `fireEvent.click` on the button (`name: /ask/i`).

### 6.4 Wiring the CI test gate

- **File**: `.github/workflows/ci.yml`
- **Step to add**: `- run: npm run test`
- **Placement**: after `npm run lint`, before `npm run build` — `astro sync` already ran as a dedicated step (types are available); tests need no build output; fail fast on logic regressions before paying the ~30–60s build cost
- **No `env:` block needed**: all three dependencies (`astro:env/server`, `@/lib/supabase`, `@anthropic-ai/sdk`) are mocked via `vi.mock` in every test file that touches them — no real secrets reach CI
- **Reference implementation**: commit on `testing-ci-gate` branch; see `context/changes/testing-ci-gate/plan.md` for rationale

The final step sequence in the `ci` job:

```yaml
- run: npm ci
- run: npx astro sync
- run: npm run lint
- run: npm run test
- run: npm run build
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

---

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview Q5 + challenger pass). Future contributors should respect these unless the underlying assumption changes.

- **Supabase integration (real DB / RLS policies)** — requires a live Supabase instance; user explicitly excluded DB integration from test scope. Re-evaluate if the project adds a local Supabase Docker setup or pgTAP to the dev environment. (Source: interview Q5.)
- **Cloudflare Workers edge runtime** — requires Wrangler and a real deployment or `unstable_dev`; user explicitly excluded. Re-evaluate if Wrangler test mode is adopted for the project. (Source: interview Q5.)
- **AI response quality / in-character accuracy** — LLM output is non-deterministic; there is no independent oracle for "is this response in-character?" Tests assert inputs to the Anthropic client, not the response content. (Source: challenger pass.)
- **Rate limiting / per-user API throttle** — deliberately not implemented in MVP (see roadmap S-04 plan). Testing the absence of rate limiting would require adding it first. Re-evaluate if rate limiting is added post-MVP. (Source: roadmap S-04 plan; challenger pass.)
- **Cross-browser visual compatibility** — small, tech-savvy GM user base; low blast radius for visual regressions. Re-evaluate if the user base grows beyond solo GMs. (Source: PRD §User & Persona.)

---

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-08
- Stack versions last verified: 2026-06-08
- AI-native tool references last verified: 2026-06-08 (none in use)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
