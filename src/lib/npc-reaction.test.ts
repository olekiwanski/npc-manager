import { describe, expect, it } from "vitest";
import { buildNpcSystemPrompt } from "./npc-reaction";
import type { Npc, Relationship } from "@/types";

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: "npc-1",
    user_id: "user-1",
    campaign_id: "campaign-1",
    name: "Gareth",
    role: "merchant",
    traits: "Cautious and secretive",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    wfrp_creature_type_id: null,
    wfrp_attributes: null,
    wfrp_traits: [],
    wfrp_skills_talents: [],
    wfrp_zyw_overridden: false,
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: "rel-1",
    user_id: "user-1",
    campaign_id: "campaign-1",
    from_npc_id: "npc-1",
    to_npc_id: "npc-2",
    type: "ally",
    description: "Old friends from the war",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRosterNpc(id: string, name: string): Npc {
  return makeNpc({ id, name, role: null, traits: null });
}

describe("buildNpcSystemPrompt", () => {
  it("includes identity, traits, and relationships when all fields are populated", () => {
    const npc = makeNpc();
    const rel = makeRelationship();
    const roster = [makeRosterNpc("npc-2", "Marcus")];
    const prompt = buildNpcSystemPrompt(npc, [rel], roster);

    expect(prompt).toContain("You are Gareth, a merchant");
    expect(prompt).toContain("Personality and traits: Cautious and secretive");
    expect(prompt).toContain("Your known relationships:");
    expect(prompt).toContain("- Marcus (ally): Old friends from the war");
    expect(prompt).toContain("Stay in character as Gareth.");
  });

  it("omits role segment when role is null", () => {
    const npc = makeNpc({ role: null });
    const prompt = buildNpcSystemPrompt(npc, [], []);

    expect(prompt).toContain("You are Gareth");
    expect(prompt).not.toContain(", a ");
  });

  it("omits traits paragraph when traits is null", () => {
    const npc = makeNpc({ traits: null });
    const prompt = buildNpcSystemPrompt(npc, [], []);

    expect(prompt).not.toContain("Personality and traits:");
  });

  it("omits relationships block when relationships array is empty", () => {
    const npc = makeNpc();
    const prompt = buildNpcSystemPrompt(npc, [], []);

    expect(prompt).not.toContain("Your known relationships:");
  });

  it("omits description segment when relationship description is null", () => {
    const npc = makeNpc();
    const rel = makeRelationship({ description: null });
    const roster = [makeRosterNpc("npc-2", "Marcus")];
    const prompt = buildNpcSystemPrompt(npc, [rel], roster);

    expect(prompt).toContain("- Marcus (ally)");
    expect(prompt).not.toContain("- Marcus (ally):");
  });

  it("uses partner name from roster when partner id is present", () => {
    const npc = makeNpc();
    const rel = makeRelationship({ to_npc_id: "npc-99" });
    const roster = [makeRosterNpc("npc-99", "Elara")];
    const prompt = buildNpcSystemPrompt(npc, [rel], roster);

    expect(prompt).toContain("- Elara (ally)");
  });

  it("uses 'an unknown NPC' fallback when partner id is not in roster", () => {
    const npc = makeNpc();
    const rel = makeRelationship({ to_npc_id: "npc-missing" });
    const prompt = buildNpcSystemPrompt(npc, [rel], []);

    expect(prompt).toContain("- an unknown NPC (ally)");
  });

  it("resolves partner from from_npc_id when current NPC is the to_npc_id (incoming edge)", () => {
    const npc = makeNpc({ id: "npc-2" });
    const rel = makeRelationship({ from_npc_id: "npc-1", to_npc_id: "npc-2" });
    const roster = [makeRosterNpc("npc-1", "Silas")];
    const prompt = buildNpcSystemPrompt(npc, [rel], roster);

    expect(prompt).toContain("- Silas (ally)");
  });
});
