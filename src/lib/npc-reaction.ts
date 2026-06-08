import type { Npc, Relationship } from "@/types";

export function buildNpcSystemPrompt(npc: Npc, relationships: Relationship[], roster: Npc[]): string {
  let prompt = `You are ${npc.name}`;
  if (npc.role !== null) {
    prompt += `, a ${npc.role}`;
  }

  if (npc.traits !== null) {
    prompt += `\nPersonality and traits: ${npc.traits}`;
  }

  if (relationships.length > 0) {
    prompt += `\nYour known relationships:`;
    for (const rel of relationships) {
      const partnerId = rel.from_npc_id !== npc.id ? rel.from_npc_id : rel.to_npc_id;
      const partner = roster.find((n) => n.id === partnerId);
      const partnerName = partner ? partner.name : "an unknown NPC";
      let line = `\n- ${partnerName} (${rel.type})`;
      if (rel.description !== null) {
        line += `: ${rel.description}`;
      }
      prompt += line;
    }
  }

  prompt += `\nStay in character as ${npc.name}. Respond to the scenario as this character would, referencing your background and relationships where relevant.`;

  return prompt;
}
