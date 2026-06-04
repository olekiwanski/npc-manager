// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RelationshipRow } from "@/components/relationships/RelationshipRow";
import type { Relationship } from "@/types";

afterEach(cleanup);

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: "r1",
    user_id: "u1",
    campaign_id: "camp1",
    from_npc_id: "npc-current",
    to_npc_id: "npc-partner",
    type: "Ally",
    description: "Trusted companion",
    created_at: "2026-06-04T00:00:00Z",
    ...overrides,
  };
}

describe("RelationshipRow two-click delete confirm", () => {
  it("requires a second click on Delete before firing onDelete", () => {
    const onDelete = vi.fn();
    render(
      <RelationshipRow
        relationship={makeRelationship()}
        currentNpcId="npc-current"
        partnerName="Partner NPC"
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("resets the pending confirmation when clicking elsewhere", () => {
    const onDelete = vi.fn();
    render(
      <RelationshipRow
        relationship={makeRelationship()}
        currentNpcId="npc-current"
        partnerName="Partner NPC"
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    fireEvent.click(document.body);
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("RelationshipRow rendering", () => {
  it("shows the partner name and type", () => {
    render(
      <RelationshipRow
        relationship={makeRelationship({ type: "Mentor" })}
        currentNpcId="npc-current"
        partnerName="Gundren"
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Gundren")).toBeTruthy();
    expect(screen.getByText("Mentor")).toBeTruthy();
  });

  it("labels the row Outgoing when from_npc_id is the current NPC", () => {
    render(
      <RelationshipRow
        relationship={makeRelationship({ from_npc_id: "npc-current", to_npc_id: "npc-partner" })}
        currentNpcId="npc-current"
        partnerName="Partner NPC"
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Outgoing")).toBeTruthy();
    expect(screen.queryByText("Incoming")).toBeNull();
  });

  it("labels the row Incoming when the current NPC is the to_npc_id", () => {
    render(
      <RelationshipRow
        relationship={makeRelationship({ from_npc_id: "npc-partner", to_npc_id: "npc-current" })}
        currentNpcId="npc-current"
        partnerName="Partner NPC"
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Incoming")).toBeTruthy();
    expect(screen.queryByText("Outgoing")).toBeNull();
  });

  it("shows a placeholder when there is no description", () => {
    render(
      <RelationshipRow
        relationship={makeRelationship({ description: null })}
        currentNpcId="npc-current"
        partnerName="Partner NPC"
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("No description")).toBeTruthy();
  });
});
