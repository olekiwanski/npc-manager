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

// Unknown/invalid status values fall back to "active" rather than erroring.
const statusFilter = z.enum(["active", "archived"]).catch("active");

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  description: z.string().max(1000, "Description must be 1000 characters or fewer").nullish(),
});

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const status = statusFilter.parse(new URL(context.request.url).searchParams.get("status") ?? "active");

  const result = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(200, { data: result.data as Campaign[] });
};

export const POST: APIRoute = async (context) => {
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const result = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select()
    .single();

  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(201, { data: result.data as Campaign });
};
