import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { POST } from "./reaction";
import { createClient } from "@/lib/supabase";

const mockStreamCall = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    [Symbol.asyncIterator]() {
      const events = [{ type: "message_stop" }];
      let i = 0;
      return {
        next(): Promise<IteratorResult<(typeof events)[number]>> {
          if (i < events.length) return Promise.resolve({ value: events[i++], done: false });
          return Promise.resolve({ value: undefined as unknown as (typeof events)[number], done: true });
        },
      };
    },
  }),
);

vi.mock("astro:env/server", () => ({
  ANTHROPIC_API_KEY: "test-key",
  SUPABASE_URL: "http://localhost",
  SUPABASE_KEY: "test-key",
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { stream: mockStreamCall } };
  }),
}));

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

const npcFixture = {
  id: "npc-1",
  name: "Gareth",
  role: "merchant",
  traits: "clever, greedy",
  campaign_id: "campaign-1",
  user_id: "user-a",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock() {
  const npcChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: npcFixture, error: null }),
  };

  const relChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  const rosterChain = {} as MockChain;
  rosterChain.select = vi.fn().mockReturnValue(rosterChain);
  rosterChain.eq = vi
    .fn()
    .mockReturnValueOnce(rosterChain)
    .mockResolvedValueOnce({ data: [npcFixture], error: null });

  return {
    from: vi.fn().mockReturnValueOnce(npcChain).mockReturnValueOnce(relChain).mockReturnValueOnce(rosterChain),
  };
}

beforeEach(() => {
  mockStreamCall.mockClear();
  const mock = makeSupabaseMock();
  vi.mocked(createClient).mockReturnValue(mock as unknown as ReturnType<typeof createClient>);
});

describe("context wiring", () => {
  it("calls messages.stream with a system prompt containing the NPC name and role for a fully-populated NPC", async () => {
    await POST(
      makeContext({
        user: { id: "user-a" },
        npcId: "npc-1",
        body: { scenario: "The party confronts the merchant." },
      }) as unknown as Parameters<typeof POST>[0],
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(mockStreamCall).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("Gareth") }));
    expect(mockStreamCall).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ system: expect.stringContaining("merchant") }),
    );
  });
});
