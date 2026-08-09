import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import type { CreatureType } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const url = new URL(context.request.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q");

  let query = supabase.from("creature_types").select().order("name");
  if (category) {
    query = query.eq("category", category);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const result = await query;
  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(200, { data: result.data as CreatureType[] });
};
