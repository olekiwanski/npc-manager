// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WfrpTraitsList } from "@/components/npcs/WfrpTraitsList";
import type { CreatureTrait, WfrpTraitAssignment } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const BRON: CreatureTrait = { id: "t-bron", name: "Broń", description: "Zadaje obrażenia.", takes_value: true };
const WIDZENIE: CreatureTrait = {
  id: "t-widzenie",
  name: "Widzenie w Ciemności",
  description: "Widzi w ciemności.",
  takes_value: false,
};

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });
}

describe("WfrpTraitsList", () => {
  it("shows a remove button for custom traits but not for template traits", async () => {
    fetchMock.mockImplementation(() => jsonResponse([BRON, WIDZENIE]));
    const traits: WfrpTraitAssignment[] = [
      { trait_id: BRON.id, value: "+7", source: "template" },
      { trait_id: WIDZENIE.id, value: null, source: "custom" },
    ];
    render(<WfrpTraitsList traits={traits} onChange={vi.fn()} />);

    expect(await screen.findByText("Broń")).toBeTruthy();
    expect(screen.queryByLabelText("Remove Broń")).toBeNull();
    expect(screen.getByLabelText("Remove Widzenie w Ciemności")).toBeTruthy();
  });

  it("adding a trait from the picker appends it with source: custom", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("q=")) return jsonResponse([BRON]);
      return jsonResponse([]);
    });
    const onChange = vi.fn();
    render(<WfrpTraitsList traits={[]} onChange={onChange} />);

    fireEvent.focus(screen.getByLabelText("Add a Creature Trait"));
    const option = await screen.findByRole("button", { name: "Broń" }, { timeout: 1000 });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith([{ trait_id: BRON.id, value: null, source: "custom" }]);
  });

  it("removing a custom trait calls onChange without it", async () => {
    fetchMock.mockImplementation(() => jsonResponse([WIDZENIE]));
    const onChange = vi.fn();
    const traits: WfrpTraitAssignment[] = [{ trait_id: WIDZENIE.id, value: null, source: "custom" }];
    render(<WfrpTraitsList traits={traits} onChange={onChange} />);

    fireEvent.click(await screen.findByLabelText("Remove Widzenie w Ciemności"));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
