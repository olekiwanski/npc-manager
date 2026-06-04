import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import type { Campaign } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer").optional(),
  description: z.string().max(1000, "Description must be 1000 characters or fewer").nullish(),
  status: z.enum(["active", "archived"]).optional(),
});

export const PATCH: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const id = context.params.id;
  if (!id) {
    return json(400, { error: "Missing campaign id" });
  }

  // RLS on UPDATE enforces ownership; .select().maybeSingle() lets us observe
  // whether a row was actually affected (empty result => not found / not owned).
  const result = await supabase.from("campaigns").update(parsed.data).eq("id", id).select().maybeSingle();

  if (result.error) {
    return json(500, { error: result.error.message });
  }
  if (!result.data) {
    return json(404, { error: "Not found" });
  }

  return json(200, { data: result.data as Campaign });
};

export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const id = context.params.id;
  if (!id) {
    return json(400, { error: "Missing campaign id" });
  }

  // RLS on DELETE enforces ownership; .select() surfaces the deleted row so an
  // empty result can be reported as 404 rather than a silent success.
  const result = await supabase.from("campaigns").delete().eq("id", id).select().maybeSingle();

  if (result.error) {
    return json(500, { error: result.error.message });
  }
  if (!result.data) {
    return json(404, { error: "Not found" });
  }

  return json(200, { data: { id: (result.data as Campaign).id } });
};
