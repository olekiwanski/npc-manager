import type { APIRoute } from "astro";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "astro:env/server";
import { createClient } from "@/lib/supabase";
import { buildNpcSystemPrompt } from "@/lib/npc-reaction";
import type { Npc, Relationship } from "@/types";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const bodySchema = z.object({
  scenario: z.string().min(1).max(500),
});

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const npcId = context.params.id;
  if (!npcId) {
    return json(400, { error: "Missing npc id" });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json(500, { error: "Database unavailable" });
  }

  const npcResult = await supabase.from("npcs").select().eq("id", npcId).eq("user_id", user.id).maybeSingle();
  if (npcResult.error) {
    return json(500, { error: npcResult.error.message });
  }
  if (!npcResult.data) {
    return json(404, { error: "Not found" });
  }
  const npc = npcResult.data as Npc;

  const relResult = await supabase.from("npc_has_npc").select().or(`from_npc_id.eq.${npcId},to_npc_id.eq.${npcId}`);
  if (relResult.error) {
    return json(500, { error: "Failed to load NPC context" });
  }

  const rosterResult = await supabase.from("npcs").select().eq("campaign_id", npc.campaign_id);
  if (rosterResult.error) {
    return json(500, { error: "Failed to load NPC context" });
  }

  const systemPrompt = buildNpcSystemPrompt(npc, relResult.data as Relationship[], rosterResult.data as Npc[]);

  if (!ANTHROPIC_API_KEY) {
    return json(503, { error: "AI service unavailable" });
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const { scenario } = parsed.data;

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: scenario }],
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const frame = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(frame));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        const frame = `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`;
        controller.enqueue(encoder.encode(frame));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
