import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import type { Relationship } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const id = context.params.id;
  if (!id) {
    return json(400, { error: "Missing relationship id" });
  }

  // RLS on DELETE enforces ownership; .select() surfaces the deleted row so an
  // empty result can be reported as 404 rather than a silent success.
  const result = await supabase.from("npc_has_npc").delete().eq("id", id).select().maybeSingle();

  if (result.error) {
    return json(500, { error: result.error.message });
  }
  if (!result.data) {
    return json(404, { error: "Not found" });
  }

  return json(200, { data: { id: (result.data as Relationship).id } });
};
