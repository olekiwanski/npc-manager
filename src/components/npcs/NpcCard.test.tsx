// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NpcCard } from "@/components/npcs/NpcCard";
import type { Npc } from "@/types";

afterEach(cleanup);

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: "n1",
    user_id: "u1",
    campaign_id: "camp1",
    name: "Gundren",
    role: "Dwarf merchant",
    traits: "Gruff but loyal",
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
    ...overrides,
  };
}

describe("NpcCard two-click delete confirm", () => {
  it("requires a second click on Delete before firing onDelete", () => {
    const onDelete = vi.fn();
    render(<NpcCard npc={makeNpc()} campaignId="camp1" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    // First click enters confirm state; callback not yet called.
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("n1");
  });

  it("resets the pending confirmation when clicking elsewhere", () => {
    const onDelete = vi.fn();
    render(<NpcCard npc={makeNpc()} campaignId="camp1" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    // An outside click cancels the confirmation.
    fireEvent.click(document.body);
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("links the title to the NPC detail page and Edit to the edit page", () => {
    render(<NpcCard npc={makeNpc()} campaignId="camp1" onDelete={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Gundren" }).getAttribute("href")).toBe("/campaigns/camp1/npcs/n1");
    expect(screen.getByRole("link", { name: /edit/i }).getAttribute("href")).toBe("/campaigns/camp1/npcs/n1/edit");
  });
});
