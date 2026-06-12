---
date: 2026-06-08T00:00:00+00:00
researcher: Claude Sonnet 4.6
git_commit: 9724a03be2e1575306956b01f1d76c7c7d7d10fe
branch: m2l4-npc-ai-reaction
repository: npc-manager
topic: "Risk #2 — Auth/ownership bypass on /reaction endpoint (IDOR via AI proxy)"
tags: [research, test-plan, phase-1, auth, ownership, idor, api-route, vitest, mocking]
status: complete
last_updated: 2026-06-08
last_updated_by: Claude Sonnet 4.6
---

# Research: Risk #2 — Auth/ownership bypass on `/reaction` endpoint

**Date**: 2026-06-08
**Researcher**: Claude Sonnet 4.6
**Git Commit**: 9724a03be2e1575306956b01f1d76c7c7d7d10fe
**Branch**: m2l4-npc-ai-reaction
**Repository**: npc-manager

## Research Question

What exactly protects the `POST /api/npcs/[id]/reaction` endpoint against:
1. Unauthenticated requests?
2. Authenticated requests that pass another user's NPC ID (IDOR)?

How should Vitest tests prove both protections given the endpoint's dependencies on `astro:env/server`, `@/lib/supabase`, and `@anthropic-ai/sdk`?

## Summary

The endpoint has two distinct guard layers. **Layer 1** (auth): checks `context.locals.user` — set by middleware via a real `supabase.auth.getUser()` call, but bypassed in unit tests by injecting `locals.user` directly on the mock `APIContext`. **Layer 2** (ownership): queries `npcs` with both `.eq("id", npcId)` AND `.eq("user_id", user.id)` — a cross-user NPC ID returns `{ data: null }` → 404.

One prerequisite is blocking: `astro:env/server` is a virtual module that does not exist in the Vitest Node environment. Without `vi.mock("astro:env/server", ...)`, **importing `reaction.ts` will throw `Cannot find module`** — all three auth/validation test cases fail before they start.

The test must also assert that `.eq("user_id", userId)` was called — not just that a 404 was returned. Without that assertion, deleting the ownership filter from line 49 of `reaction.ts` would not be caught.

---

## Detailed Findings

### A. Guard sequence in `reaction.ts`

File: `src/pages/api/npcs/[id]/reaction.ts`

The handler runs four guards in order. Tests must understand this ordering to mock correctly — an earlier guard short-circuits, so mocks for later guards are irrelevant if an earlier one fires.

| Order | Guard | Code location | Result |
|-------|-------|---------------|--------|
| 1 | `ANTHROPIC_API_KEY` absent | `reaction.ts:22-24` | 503 |
| 2 | `!user \|\| !supabase` | `reaction.ts:26-30` | 401 |
| 3 | Zod body schema | `reaction.ts:39-41` | 400 |
| 4 | NPC ownership query | `reaction.ts:49-55` | 404 if not found |

**Critical for mocking**: Guard 1 fires before Guard 2. If `ANTHROPIC_API_KEY` resolves to `undefined` (because `astro:env/server` is not mocked), the route returns 503 for every test case — including the unauthenticated-request test, which expects 401. The test would produce a wrong-status false-pass if it only checks `response.ok === false` without asserting the exact status code.

### B. How `locals.user` is populated and why tests bypass it

File: `src/middleware.ts:6-16`

```typescript
const { data: { user } } = await supabase.auth.getUser();
context.locals.user = user ?? null;
```

The middleware makes a live `supabase.auth.getUser()` call on every request. In tests, the route handler (`POST`) is called **directly** with a hand-built `APIContext` — the middleware never runs. Therefore `locals.user` is whatever the test injects.

**Unauthenticated scenario**: inject `locals.user: null`.
**Authenticated scenario**: inject `locals.user: { id: "user-a", ... }` (partial User object — only `id` is used by the route).

### C. The ownership filter — what makes IDOR protection work

File: `src/pages/api/npcs/[id]/reaction.ts:49`

```typescript
const npcResult = await supabase
  .from("npcs")
  .select()
  .eq("id", npcId)
  .eq("user_id", user.id)   // ← ownership filter
  .maybeSingle();
```

Both `.eq()` calls are necessary. Removing the second one would allow user A to fetch context for user B's NPC and leak it to the Claude system prompt — the IDOR scenario from the risk map.

**What the mock must return**: for the cross-user test, configure `.maybeSingle()` to return `{ data: null, error: null }`. This simulates Supabase finding no row matching both `id = npc-owned-by-b` AND `user_id = user-a`.

**The assertion that kills the mutation**: after calling the handler, assert:

```typescript
expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-a");
```

Without this, removing the `.eq("user_id", user.id)` call from the route still passes the test (the mock always returns null regardless of which `.eq()` calls were made).

### D. `createClient` can return `null` — second path to 401

File: `src/lib/supabase.ts:6-8`

```typescript
if (!SUPABASE_URL || !SUPABASE_KEY) {
  return null;
}
```

The auth guard (`reaction.ts:28`) checks `!user || !supabase`. If `createClient` returns `null`, the route returns 401 even when `locals.user` is set. This is a distinct path from the `!user` case but produces the same response.

**Test implication**: for the unauthenticated test, `createClient` can return either a mock supabase object or `null` — both produce 401. The cleaner choice is to return a mock object to isolate the `!user` condition specifically.

### E. Vitest mocking requirements

Three modules must be mocked before importing `reaction.ts`:

#### 1. `astro:env/server` (blocking prerequisite)

`astro:env/server` is a virtual module generated by Astro's build pipeline. It does not exist in the Node/Vitest environment. Importing `reaction.ts` without mocking this module fails immediately.

```typescript
vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: "test-key",
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));
```

To test the missing-key path (Risk #5), override this mock per-test:

```typescript
vi.mocked(/* module re-import trick or vi.doMock */)
```

#### 2. `@/lib/supabase`

Mock `createClient` to return a controlled Supabase stub. The stub implements the builder chain used in `reaction.ts`:

```typescript
vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

// In beforeEach or per-test setup:
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};
const mockSupabase = { from: vi.fn().mockReturnValue(mockChain) };
vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>);
```

**Chain gotcha**: `.eq()` returns `this` in the mock — every `.eq()` call hits the same `vi.fn()`. `expect(mockChain.eq).toHaveBeenCalledWith("user_id", userId)` will find the call even among multiple `.eq()` invocations on the same chain, because `toHaveBeenCalledWith` checks *any* call, not just the last one.

#### 3. `@anthropic-ai/sdk`

Not reached in auth/ownership failure cases, but the module must be importable:

```typescript
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
}));
```

### F. Mock `APIContext` structure

The route accesses: `context.locals.user`, `context.request.headers`, `context.cookies`, `context.params.id`, `context.request.json()`.

```typescript
function makeContext(overrides: {
  user?: Partial<User> | null;
  npcId?: string;
  body?: unknown;
}) {
  return {
    locals: { user: overrides.user ?? null },
    request: new Request("http://localhost/api/npcs/npc-1/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrides.body ?? { scenario: "A bandit threatens the market stall." }),
    }),
    cookies: { set: vi.fn(), get: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
    params: { id: overrides.npcId ?? "npc-1" },
  };
}
```

The `Request` constructor is available natively in the Vitest Node environment (Node 18+).

### G. Two test cases that prove Risk #2 protection

**Test 1 — Unauthenticated request → 401**

```typescript
it("returns 401 when no user is authenticated", async () => {
  vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>);
  const ctx = makeContext({ user: null });

  const response = await POST(ctx as Parameters<typeof POST>[0]);

  expect(response.status).toBe(401);
  const body = await response.json();
  expect(body.error).toBe("Unauthorized");
});
```

**Test 2 — Cross-user NPC ID → 404 (IDOR blocked)**

```typescript
it("returns 404 when NPC belongs to a different user", async () => {
  vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>);
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null }); // NPC not found for user-a

  const ctx = makeContext({
    user: { id: "user-a" },
    npcId: "npc-owned-by-user-b",
    body: { scenario: "A scenario" },
  });

  const response = await POST(ctx as Parameters<typeof POST>[0]);

  expect(response.status).toBe(404);
  // Assert the ownership filter was applied — kills the mutation where .eq("user_id", ...) is removed
  expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-a");
});
```

### H. Impl-review findings relevant to auth/ownership

From `context/changes/npc-ai-reaction/reviews/impl-review.md`:

- **F1** — Roster query lacked `.eq("user_id", user.id)`. Fixed at `reaction.ts:64`. If this filter is absent, a cross-campaign roster lookup could leak NPC names from other users' campaigns into the Claude system prompt — a secondary data exposure even if the primary NPC ownership check passes.
- **F5** — `ANTHROPIC_API_KEY` guard was originally placed *after* three DB queries. Moved to the top (`reaction.ts:22`). Tests must account for this ordering.
- **F6** — `createClient` was originally called after body parsing. Now called together with the user check (`reaction.ts:26-30`). Combined guard means `!supabase` is now a genuine 401 path.

---

## Code References

- `src/pages/api/npcs/[id]/reaction.ts:22-30` — guard sequence: API key, then auth
- `src/pages/api/npcs/[id]/reaction.ts:49` — ownership query: double `.eq()` with `user_id`
- `src/middleware.ts:12-14` — `locals.user` population (bypassed in tests)
- `src/lib/supabase.ts:6-8` — `createClient` returns `null` when URL/KEY absent
- `src/env.d.ts:1-5` — `Locals` type: `user: User | null`
- `src/lib/npc-reaction.test.ts:1-17` — existing test helper pattern (`makeNpc`, `makeRelationship`) to reuse
- `vitest.config.ts:14-16` — `@` alias resolves to `/src`; no alias for `astro:env/server`
- `astro.config.mjs:21` — `ANTHROPIC_API_KEY: envField.string({ optional: true })` — optional means undefined in test env without mock

---

## Architecture Insights

1. **Guards are sequential, not composed.** The `ANTHROPIC_API_KEY` check (`reaction.ts:22`) fires before auth (`reaction.ts:26`). A test that expects 401 but forgets to mock `astro:env/server` will receive 503 — the test passes `response.ok === false` but asserts the wrong code.

2. **Middleware is not called in handler unit tests.** `locals.user` must be injected manually. There is no hook between `createClient` and the user check — if `createClient` returns `null` (because SUPABASE_URL/KEY are mocked as `"test-key"`), the 401 fires on the `!supabase` branch. Ensure the mock returns a real mock object, not null.

3. **Supabase `.eq()` returns `this` — asserting call order is impractical.** Use `toHaveBeenCalledWith` to check that a specific `.eq("user_id", userId)` call was made at any point in the chain — sufficient to prove ownership filter is applied.

4. **Both roster and NPC queries use `user_id` filter (post-F1 fix).** The roster query at `reaction.ts:64` also has `.eq("user_id", user.id)`. For auth/ownership tests this code path is never reached (handler returns 404 before the parallel queries fire), so no mock setup is needed for it in auth tests.

5. **`@anthropic-ai/sdk` does not need to be called — but must be importable.** The module is imported at the top of `reaction.ts`. Without mocking it, importing the route file in Vitest will try to execute the module (which may make real HTTP calls or fail to initialize). Mock the constructor to a no-op.

---

## Historical Context

- `context/changes/npc-ai-reaction/plan.md §Phase 3` — ownership check specified as `.eq("id", npcId).eq("user_id", user.id)`; test-plan §2 listed IDOR as Risk #2 with source in PRD Access Control guardrail.
- `context/changes/npc-ai-reaction/reviews/impl-review.md F1, F5, F6` — three post-impl fixes directly affect the guard sequence and the scope of data queries; tests must reflect the fixed state.

---

## Open Questions

- **`vi.doMock` vs module-level `vi.mock` for testing the missing-key path (Risk #5)**: `vi.mock` is hoisted and applies to all tests in the file. Testing `ANTHROPIC_API_KEY = undefined` in the same file as the auth tests requires either a separate test file, `vi.doMock` with dynamic imports, or factory-based `vi.mock` with a module-level variable. Resolve in the plan phase.
- **`AstroCookies` mock completeness**: `context.cookies` is passed to `createClient` but `createClient` is mocked — the cookies object only needs to satisfy TypeScript (no runtime calls). An empty `{ set: vi.fn(), get: vi.fn(), getAll: vi.fn() }` suffices.
