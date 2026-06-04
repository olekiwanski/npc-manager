// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NpcList } from "@/components/npcs/NpcList";
import type { Npc } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function npc(overrides: Partial<Npc>): Npc {
  return {
    id: "npc-1",
    user_id: "u1",
    campaign_id: "c1",
    name: "Gundren",
    role: null,
    traits: null,
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
    ...overrides,
  };
}

describe("NpcList", () => {
  it("shows the empty state CTA when there are no NPCs", () => {
    render(<NpcList initialNpcs={[]} campaignId="c1" />);
    expect(screen.getByText(/doesn't have any npcs yet/i)).toBeTruthy();
    const cta = screen.getByRole("link", { name: /create your first npc/i });
    expect(cta.getAttribute("href")).toBe("/campaigns/c1/npcs/new");
  });

  it("renders a card per initial NPC", () => {
    render(
      <NpcList initialNpcs={[npc({ id: "a", name: "Gundren" }), npc({ id: "b", name: "Sildar" })]} campaignId="c1" />,
    );
    expect(screen.getByText("Gundren")).toBeTruthy();
    expect(screen.getByText("Sildar")).toBeTruthy();
  });

  it("removes the card on successful delete", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { id: "a" } }) });

    render(<NpcList initialNpcs={[npc({ id: "a", name: "Gundren" })]} campaignId="c1" />);

    // Two-click confirm: first click sets confirming state, second fires onDelete
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));

    await waitFor(() => {
      expect(screen.queryByText("Gundren")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/npcs/a", { method: "DELETE" });
  });

  it("shows ServerError when the delete fetch returns an error", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Not found" }) });

    render(<NpcList initialNpcs={[npc({ id: "a", name: "Gundren" })]} campaignId="c1" />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));

    expect(await screen.findByText("Not found")).toBeTruthy();
    // Card stays visible on error
    expect(screen.getByText("Gundren")).toBeTruthy();
  });

  it("pendingId guard prevents a second concurrent delete for the same NPC", async () => {
    let resolveFirst: (() => void) | undefined;
    const firstRequest = new Promise<void>((r) => {
      resolveFirst = r;
    });
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          void firstRequest.then(() => {
            res({ ok: true, json: () => Promise.resolve({}) });
          });
        }),
    );

    render(<NpcList initialNpcs={[npc({ id: "a", name: "Gundren" })]} campaignId="c1" />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));

    // Second call while first is in flight — should be a no-op
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    if (resolveFirst) resolveFirst();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
