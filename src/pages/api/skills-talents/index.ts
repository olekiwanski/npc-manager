import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import type { SkillTalent } from "@/types";

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
  const q = url.searchParams.get("q");
  const kind = url.searchParams.get("kind");

  let query = supabase.from("skills_talents").select().order("name");
  if (kind) {
    query = query.eq("kind", kind);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const result = await query;
  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(200, { data: result.data as SkillTalent[] });
};
