import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import type { Relationship } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createSchema = z.object({
  campaign_id: z.uuid("Invalid campaign id"),
  from_npc_id: z.uuid("Invalid from npc id"),
  to_npc_id: z.uuid("Invalid to npc id"),
  type: z.string().min(1, "Type is required").max(100, "Type must be 100 characters or fewer"),
  description: z.string().max(2000, "Description must be 2000 characters or fewer").nullish(),
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

  if (parsed.data.from_npc_id === parsed.data.to_npc_id) {
    return json(400, { error: "An NPC cannot have a relationship with itself" });
  }

  // Confirm the target campaign is owned before inserting. The RLS-scoped select
  // only sees the caller's own campaigns, so an empty result means the campaign
  // either doesn't exist or belongs to another user => 404.
  const campaign = await supabase.from("campaigns").select("id").eq("id", parsed.data.campaign_id).maybeSingle();

  if (campaign.error) {
    return json(500, { error: campaign.error.message });
  }
  if (!campaign.data) {
    return json(404, { error: "Campaign not found" });
  }

  // Confirm both NPCs live in that campaign. RLS scopes this to the caller's own
  // NPCs, so a foreign NPC or one from another campaign drops out of the result.
  // We expect exactly 2 rows; anything else means a NPC is missing / not owned.
  const npcs = await supabase
    .from("npcs")
    .select("id")
    .eq("campaign_id", parsed.data.campaign_id)
    .in("id", [parsed.data.from_npc_id, parsed.data.to_npc_id]);

  if (npcs.error) {
    return json(500, { error: npcs.error.message });
  }
  if (npcs.data.length !== 2) {
    return json(404, { error: "NPC not found" });
  }

  // The npc_has_npc_insert_own RLS policy independently re-checks ownership and
  // the same-campaign invariant as defense in depth.
  const result = await supabase
    .from("npc_has_npc")
    .insert({
      user_id: user.id,
      campaign_id: parsed.data.campaign_id,
      from_npc_id: parsed.data.from_npc_id,
      to_npc_id: parsed.data.to_npc_id,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
    })
    .select()
    .single();

  if (result.error) {
    return json(500, { error: result.error.message });
  }

  return json(201, { data: result.data as Relationship });
};
