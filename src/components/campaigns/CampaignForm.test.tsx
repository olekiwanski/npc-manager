// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
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

const existing: Campaign = {
  id: "c1",
  user_id: "u1",
  name: "Existing Campaign",
  description: "Existing description",
  status: "archived",
  created_at: "2026-06-04T00:00:00Z",
  updated_at: "2026-06-04T00:00:00Z",
};

describe("CampaignForm rendering", () => {
  it("create mode shows name + description and no status select", () => {
    render(<CampaignForm />);
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(screen.getByRole("button", { name: /create campaign/i })).toBeTruthy();
  });

  it("edit mode pre-fills fields and shows the status select", () => {
    render(<CampaignForm campaign={existing} />);
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("Existing Campaign");
    expect(screen.getByLabelText<HTMLTextAreaElement>("Description").value).toBe("Existing description");
    const status = screen.getByLabelText<HTMLSelectElement>("Status");
    expect(status.value).toBe("archived");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy();
  });
});

describe("CampaignForm validation", () => {
  it("blocks submit and shows an error when name is empty", async () => {
    render(<CampaignForm />);
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));

    expect(await screen.findByText("Name is required")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a description over 1000 characters", async () => {
    render(<CampaignForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Valid name" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "x".repeat(1001) } });
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));

    expect(await screen.findByText(/1000 characters or fewer/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to /api/campaigns when the form is valid", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    render(<CampaignForm />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Campaign" } });
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/campaigns");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toMatchObject({ name: "New Campaign", description: null });
  });
});
