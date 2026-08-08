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

const wfrpAttributesSchema = z.object({
  sz: z.number().int().min(0).max(100),
  ww: z.number().int().min(0).max(100),
  us: z.number().int().min(0).max(100),
  s: z.number().int().min(0).max(100),
  wt: z.number().int().min(0).max(100),
  i: z.number().int().min(0).max(100),
  zw: z.number().int().min(0).max(100),
  zr: z.number().int().min(0).max(100),
  int: z.number().int().min(0).max(100),
  sw: z.number().int().min(0).max(100),
  ogd: z.number().int().min(0).max(100),
  zyw: z.number().int().min(0).max(100),
});

const wfrpTraitAssignmentSchema = z.object({
  trait_id: z.uuid(),
  value: z.string().max(200).nullish(),
  source: z.enum(["template", "custom"]),
});

const wfrpSkillTalentAssignmentSchema = z.object({
  id: z.uuid(),
  value: z.string().max(200).nullish(),
});

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer").optional(),
  role: z.string().max(200, "Role must be 200 characters or fewer").nullish(),
  traits: z.string().max(2000, "Traits must be 2000 characters or fewer").nullish(),
  wfrp_creature_type_id: z.uuid().nullish(),
  wfrp_attributes: wfrpAttributesSchema.nullish(),
  wfrp_traits: z.array(wfrpTraitAssignmentSchema).nullish(),
  wfrp_skills_talents: z.array(wfrpSkillTalentAssignmentSchema).nullish(),
  wfrp_zyw_overridden: z.boolean().nullish(),
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
    return json(400, { error: "Missing npc id" });
  }

  // RLS on UPDATE enforces ownership; .select().maybeSingle() lets us observe
  // whether a row was actually affected (empty result => not found / not owned).
  const result = await supabase.from("npcs").update(parsed.data).eq("id", id).select().maybeSingle();

  if (result.error) {
    return json(500, { error: result.error.message });
  }
  if (!result.data) {
    return json(404, { error: "Not found" });
  }

  return json(200, { data: result.data as Npc });
};

export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  const user = context.locals.user;
  if (!supabase || !user) {
    return json(401, { error: "Unauthorized" });
  }

  const id = context.params.id;
  if (!id) {
    return json(400, { error: "Missing npc id" });
  }

  // RLS on DELETE enforces ownership; .select() surfaces the deleted row so an
  // empty result can be reported as 404 rather than a silent success.
  const result = await supabase.from("npcs").delete().eq("id", id).select().maybeSingle();

  if (result.error) {
    return json(500, { error: result.error.message });
  }
  if (!result.data) {
    return json(404, { error: "Not found" });
  }

  return json(200, { data: { id: (result.data as Npc).id } });
};
