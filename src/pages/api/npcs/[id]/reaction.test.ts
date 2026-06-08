import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { POST } from "./reaction";
import { createClient } from "@/lib/supabase";

vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: "test-key",
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { stream: vi.fn() } })),
}));

function makeSupabaseMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

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

let mock: ReturnType<typeof makeSupabaseMock>;

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.mocked(createClient).mockReturnValue(mock as unknown as ReturnType<typeof createClient>);
});

describe("scenario validation", () => {
  // Auth guard fires first (reaction.ts:28), so a valid user is required here.
  // Zod fires before the ownership query (reaction.ts:39 vs :49),
  // so the Supabase mock is inert — maybeSingle is never called.
  it("returns 400 when scenario is empty string", async () => {
    const response = await POST(
      makeContext({ user: { id: "user-1" }, body: { scenario: "" } }) as unknown as Parameters<typeof POST>[0],
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when scenario exceeds 500 characters", async () => {
    const response = await POST(
      makeContext({ user: { id: "user-1" }, body: { scenario: "a".repeat(501) } }) as unknown as Parameters<
        typeof POST
      >[0],
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when scenario key is missing", async () => {
    const response = await POST(
      makeContext({ user: { id: "user-1" }, body: {} }) as unknown as Parameters<typeof POST>[0],
    );
    expect(response.status).toBe(400);
  });
});

describe("auth and ownership", () => {
  it("returns 401 with Unauthorized when user is not authenticated", async () => {
    const response = await POST(makeContext({ user: null }) as unknown as Parameters<typeof POST>[0]);
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 with Not found and filters by user_id for cross-user NPC", async () => {
    const response = await POST(
      makeContext({ user: { id: "user-a" }, npcId: "npc-owned-by-b" }) as unknown as Parameters<typeof POST>[0],
    );
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(404);
    expect(body.error).toBe("Not found");
    expect(mock._chain.eq).toHaveBeenCalledWith("id", "npc-owned-by-b");
    expect(mock._chain.eq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
