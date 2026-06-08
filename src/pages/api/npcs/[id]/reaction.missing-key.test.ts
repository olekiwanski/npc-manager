import { vi, describe, it, expect } from "vitest";
import { POST } from "./reaction";

vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: undefined,
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

describe("missing API key", () => {
  it("returns 503 with AI service unavailable when ANTHROPIC_API_KEY is absent", async () => {
    const ctx = {
      locals: { user: { id: "user-1" } },
      request: new Request("http://localhost/api/npcs/npc-1/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "The party confronts the merchant." }),
      }),
      cookies: { set: vi.fn(), get: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
      params: { id: "npc-1" },
    };
    const response = await POST(ctx as unknown as Parameters<typeof POST>[0]);
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(503);
    expect(body.error).toBe("AI service unavailable");
  });
});
