// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CampaignList } from "@/components/campaigns/CampaignList";
import type { Campaign } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function campaign(overrides: Partial<Campaign>): Campaign {
  return {
    id: "id",
    user_id: "u1",
    name: "Name",
    description: null,
    status: "active",
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
    ...overrides,
  };
}

const respondWith = (data: Campaign[]) => ({ ok: true, json: () => Promise.resolve({ data }) });

describe("CampaignList", () => {
  it("shows the empty state with a create CTA when there are no campaigns", () => {
    render(<CampaignList initialCampaigns={[]} />);
    expect(screen.getByText(/don't have any campaigns yet/i)).toBeTruthy();
    const cta = screen.getByRole("link", { name: /create your first campaign/i });
    expect(cta.getAttribute("href")).toBe("/campaigns/new");
  });

  it("renders a card per initial campaign", () => {
    render(
      <CampaignList initialCampaigns={[campaign({ id: "a", name: "Alpha" }), campaign({ id: "b", name: "Beta" })]} />,
    );
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("fetches archived on toggle and re-fetches active on toggle-back (no stale SSR restore)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("status=archived"))
        return Promise.resolve(respondWith([campaign({ id: "arch", name: "Old Quest" })]));
      return Promise.resolve(respondWith([campaign({ id: "act", name: "Active Quest" })]));
    });

    render(<CampaignList initialCampaigns={[campaign({ id: "act", name: "Active Quest" })]} />);

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByText("Old Quest")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/campaigns?status=archived");

    // Toggling back must re-fetch the active list rather than restoring the
    // immutable initialCampaigns snapshot (plan-review finding F1).
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/campaigns?status=active");
    });
  });
});
