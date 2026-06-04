import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import type { Npc } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createSchema = z.object({
  campaign_id: z.uuid("Invalid campaign id"),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  role: z.string().max(200, "Role must be 200 characters or fewer").nullish(),
  traits: z.string().max(2000, "Traits must be 2000 characters or fewer").nullish(),
});

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

  // Confirm the target campaign is owned before inserting. The RLS-scoped
  // select only sees the caller's own campaigns, so an empty result means the
  // campaign either doesn't exist or belongs to another user => 404. The
  // npcs_insert_own RLS policy independently re-checks this as defense in depth.
  const campaign = await supabase.from("campaigns").select("id").eq("id", parsed.data.campaign_id).maybeSingle();

  if (campaign.error) {
    return json(500, { error: campaign.error.message });
  }
  if (!campaign.data) {
    return json(404, { error: "Campaign not found" });
  }

  const result = await supabase
    .from("npcs")
    .insert({
      user_id: user.id,
      campaign_id: parsed.data.campaign_id,
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      traits: parsed.data.traits ?? null,
    })
    .select()
    .single();

  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(201, { data: result.data as Npc });
};
