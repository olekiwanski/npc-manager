// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NpcForm } from "@/components/npcs/NpcForm";
import type { CreatureType } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const WAMPIRY: CreatureType = {
  id: "ct-wampiry",
  category: "niespokojni_umarli",
  subcategory: null,
  name: "Wampiry",
  default_attributes: {
    sz: 6,
    ww: 60,
    us: 40,
    s: 50,
    wt: 40,
    i: 50,
    zw: 70,
    zr: 40,
    int: 40,
    sw: 60,
    ogd: 40,
    zyw: 19,
  },
  default_traits: [],
  suggested_traits: [],
};

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });
}

function installFetchMock() {
  fetchMock.mockImplementation((url: string) => {
    if (url.startsWith("/api/creature-types")) return jsonResponse([WAMPIRY]);
    if (url.startsWith("/api/creature-traits")) return jsonResponse([]);
    if (url.startsWith("/api/skills-talents")) return jsonResponse([]);
    return jsonResponse([]);
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("NpcForm WFRP integration (real pointer/focus sequence via userEvent, inside the actual <form>)", () => {
  it("selecting a creature type from the search results updates the form without submitting it", async () => {
    installFetchMock();
    const user = userEvent.setup();
    render(<NpcForm campaignId="camp1" />);

    await user.click(screen.getByRole("button", { name: /WFRP4e Stats/i }));
    await user.click(screen.getByLabelText("Creature type"));
    await user.type(screen.getByLabelText("Creature type"), "wamp");

    const option = await screen.findByRole("button", { name: "Wampiry" }, { timeout: 2000 });
    await user.click(option);

    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("50");
    // A click that accidentally submits the form would show this validation
    // error (Name is empty) instead of applying the creature type.
    expect(screen.queryByText("Name is required")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/npcs")).toBe(false);
  });
});
