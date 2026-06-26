import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("astro:middleware", () => ({
  defineMiddleware: (fn: unknown) => fn,
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase";
import { onRequest } from "./middleware";

const mockCreateClient = vi.mocked(createClient);
const next = vi.fn();

function makeContext(pathname: string, user: Record<string, unknown> | null = null) {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  } as unknown as ReturnType<typeof createClient>);

  const redirect = vi.fn((url: string) => ({ redirectTo: url }));

  const ctx = {
    url: new URL(`http://localhost${pathname}`),
    locals: {} as Record<string, unknown>,
    request: new Request(`http://localhost${pathname}`),
    cookies: { set: vi.fn() },
    redirect,
  } as unknown as Parameters<typeof onRequest>[0];

  return { ctx, redirect };
}

describe("middleware", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    next.mockResolvedValue(new Response("ok"));
  });

  describe("unauthenticated user", () => {
    it("passes through /", async () => {
      const { ctx } = makeContext("/");
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("passes through /auth/signin", async () => {
      const { ctx } = makeContext("/auth/signin");
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("passes through /auth/signup", async () => {
      const { ctx } = makeContext("/auth/signup");
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("redirects /dashboard to /auth/signin", async () => {
      const { ctx, redirect } = makeContext("/dashboard");
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
      expect(next).not.toHaveBeenCalled();
    });

    it("redirects /campaigns to /auth/signin", async () => {
      const { ctx, redirect } = makeContext("/campaigns");
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
      expect(next).not.toHaveBeenCalled();
    });

    it("redirects /campaigns/123/npcs to /auth/signin", async () => {
      const { ctx, redirect } = makeContext("/campaigns/123/npcs");
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });
  });

  describe("authenticated user", () => {
    const user = { id: "user-1", email: "gm@example.com" };

    it("redirects / to /dashboard", async () => {
      const { ctx, redirect } = makeContext("/", user);
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
      expect(next).not.toHaveBeenCalled();
    });

    it("redirects /auth/signin to /dashboard", async () => {
      const { ctx, redirect } = makeContext("/auth/signin", user);
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
      expect(next).not.toHaveBeenCalled();
    });

    it("redirects /auth/signup to /dashboard", async () => {
      const { ctx, redirect } = makeContext("/auth/signup", user);
      await onRequest(ctx, next);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
      expect(next).not.toHaveBeenCalled();
    });

    it("passes through /campaigns", async () => {
      const { ctx } = makeContext("/campaigns", user);
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("passes through /dashboard", async () => {
      const { ctx } = makeContext("/dashboard", user);
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("passes through /campaigns/123/npcs/456", async () => {
      const { ctx } = makeContext("/campaigns/123/npcs/456", user);
      await onRequest(ctx, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
