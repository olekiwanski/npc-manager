// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NpcForm } from "@/components/npcs/NpcForm";
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

const existing: Npc = {
  id: "n1",
  user_id: "u1",
  campaign_id: "camp1",
  name: "Existing NPC",
  role: "Existing role",
  traits: "Existing traits",
  created_at: "2026-06-04T00:00:00Z",
  updated_at: "2026-06-04T00:00:00Z",
};

describe("NpcForm rendering", () => {
  it("create mode shows name, role, and traits with no pre-filled values", () => {
    render(<NpcForm campaignId="camp1" />);
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Role").value).toBe("");
    expect(screen.getByLabelText<HTMLTextAreaElement>("Traits").value).toBe("");
    expect(screen.getByRole("button", { name: /create npc/i })).toBeTruthy();
  });

  it("edit mode pre-fills all three fields from the npc prop", () => {
    render(<NpcForm campaignId="camp1" npc={existing} />);
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("Existing NPC");
    expect(screen.getByLabelText<HTMLInputElement>("Role").value).toBe("Existing role");
    expect(screen.getByLabelText<HTMLTextAreaElement>("Traits").value).toBe("Existing traits");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy();
  });
});

describe("NpcForm validation", () => {
  it("blocks submit and shows an error when name is empty", async () => {
    render(<NpcForm campaignId="camp1" />);
    fireEvent.click(screen.getByRole("button", { name: /create npc/i }));

    expect(await screen.findByText("Name is required")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a name over 200 characters", async () => {
    render(<NpcForm campaignId="camp1" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "x".repeat(201) } });
    fireEvent.click(screen.getByRole("button", { name: /create npc/i }));

    expect(await screen.findByText(/200 characters or fewer/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects traits over 2000 characters", async () => {
    render(<NpcForm campaignId="camp1" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Valid name" } });
    fireEvent.change(screen.getByLabelText("Traits"), { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: /create npc/i }));

    expect(await screen.findByText(/2000 characters or fewer/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows ServerError when the API returns an error", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Server error" }) });
    render(<NpcForm campaignId="camp1" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Gundren" } });
    fireEvent.click(screen.getByRole("button", { name: /create npc/i }));

    expect(await screen.findByText("Server error")).toBeTruthy();
  });

  it("POSTs to /api/npcs with campaign_id when the form is valid", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    render(<NpcForm campaignId="camp1" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Gundren" } });
    fireEvent.click(screen.getByRole("button", { name: /create npc/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/npcs");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toMatchObject({
      name: "Gundren",
      role: null,
      traits: null,
      campaign_id: "camp1",
    });
  });
});
