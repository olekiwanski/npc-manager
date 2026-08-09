// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RelationshipSection } from "@/components/relationships/RelationshipSection";
import type { Npc, Relationship } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: "npc-current",
    user_id: "u1",
    campaign_id: "camp1",
    name: "Current NPC",
    role: null,
    traits: null,
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
    wfrp_creature_type_id: null,
    wfrp_attributes: null,
    wfrp_traits: [],
    wfrp_skills_talents: [],
    wfrp_zyw_overridden: false,
    ...overrides,
  };
}

const currentNpc = makeNpc({ id: "npc-current", name: "Current NPC" });
const partnerNpc = makeNpc({ id: "npc-partner", name: "Partner NPC" });

describe("RelationshipSection add form", () => {
  it("renders the partner select, type input, and description textarea when a partner exists", () => {
    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[]}
      />,
    );

    expect(screen.getByLabelText<HTMLSelectElement>("Linked NPC")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Type")).toBeTruthy();
    expect(screen.getByLabelText<HTMLTextAreaElement>("Description")).toBeTruthy();
    // The current NPC is not an eligible partner.
    expect(screen.queryByRole("option", { name: "Current NPC" })).toBeNull();
    expect(screen.getByRole("option", { name: "Partner NPC" })).toBeTruthy();
  });

  it("blocks submit and shows an error when type is empty", async () => {
    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add relationship/i }));

    expect(await screen.findByText("Type is required")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a type over 100 characters", async () => {
    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "x".repeat(101) } });
    fireEvent.click(screen.getByRole("button", { name: /add relationship/i }));

    expect(await screen.findByText(/100 characters or fewer/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a description over 2000 characters", async () => {
    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "Ally" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: /add relationship/i }));

    expect(await screen.findByText(/2000 characters or fewer/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to /api/relationships with from_npc_id, to_npc_id, and campaign_id on a valid submit", async () => {
    const created: Relationship = {
      id: "r-new",
      user_id: "u1",
      campaign_id: "camp1",
      from_npc_id: "npc-current",
      to_npc_id: "npc-partner",
      type: "Ally",
      description: null,
      created_at: "2026-06-04T00:00:00Z",
    };
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: created }) });

    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "Ally" } });
    fireEvent.click(screen.getByRole("button", { name: /add relationship/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/relationships");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toMatchObject({
      campaign_id: "camp1",
      from_npc_id: "npc-current",
      to_npc_id: "npc-partner",
      type: "Ally",
    });

    // The newly created relationship is appended to the list (heading in the row,
    // distinct from the same name in the partner <select> option).
    expect(await screen.findByRole("heading", { name: "Partner NPC" })).toBeTruthy();
  });
});

describe("RelationshipSection no-partner branch", () => {
  it("hides the form and shows the hint when the current NPC is the only one", () => {
    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc]}
        initialRelationships={[]}
      />,
    );

    expect(screen.queryByLabelText("Type")).toBeNull();
    expect(screen.getByText(/add another npc to this campaign/i)).toBeTruthy();
  });
});

describe("RelationshipSection list", () => {
  it("renders an initial relationship with the partner name resolved from campaignNpcs", () => {
    const relationship: Relationship = {
      id: "r1",
      user_id: "u1",
      campaign_id: "camp1",
      from_npc_id: "npc-current",
      to_npc_id: "npc-partner",
      type: "Rival",
      description: "Old grudge",
      created_at: "2026-06-04T00:00:00Z",
    };

    render(
      <RelationshipSection
        npcId="npc-current"
        campaignId="camp1"
        campaignNpcs={[currentNpc, partnerNpc]}
        initialRelationships={[relationship]}
      />,
    );

    // Row heading carries the resolved partner name (the <select> option has the same text).
    expect(screen.getByRole("heading", { name: "Partner NPC" })).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();
  });
});
