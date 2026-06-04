// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import type { Campaign } from "@/types";

afterEach(cleanup);

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    user_id: "u1",
    name: "Test Campaign",
    description: "desc",
    status: "active",
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
    ...overrides,
  };
}

describe("CampaignCard two-click confirm", () => {
  it("requires a second click on Archive before firing onArchive", () => {
    const onArchive = vi.fn();
    render(<CampaignCard campaign={makeCampaign()} onArchive={onArchive} onUnarchive={vi.fn()} onDelete={vi.fn()} />);

    const archiveBtn = screen.getByRole("button", { name: /archive/i });
    fireEvent.click(archiveBtn);
    // First click enters confirm state; callback not yet called.
    expect(onArchive).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onArchive).toHaveBeenCalledWith("c1");
  });

  it("requires a second click on Delete before firing onDelete", () => {
    const onDelete = vi.fn();
    render(<CampaignCard campaign={makeCampaign()} onArchive={vi.fn()} onUnarchive={vi.fn()} onDelete={onDelete} />);

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("resets the pending confirmation when clicking elsewhere", () => {
    const onArchive = vi.fn();
    render(<CampaignCard campaign={makeCampaign()} onArchive={onArchive} onUnarchive={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /archive/i }));
    expect(screen.getByRole("button", { name: /confirm\?/i })).toBeTruthy();

    // An outside click cancels the confirmation.
    fireEvent.click(document.body);
    expect(screen.getByRole("button", { name: /^archive$/i })).toBeTruthy();
    expect(onArchive).not.toHaveBeenCalled();
  });

  it("shows Unarchive (not Archive) for an archived campaign", () => {
    const onUnarchive = vi.fn();
    render(
      <CampaignCard
        campaign={makeCampaign({ status: "archived" })}
        onArchive={vi.fn()}
        onUnarchive={onUnarchive}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /^archive$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /unarchive/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm\?/i }));
    expect(onUnarchive).toHaveBeenCalledWith("c1");
  });
});
