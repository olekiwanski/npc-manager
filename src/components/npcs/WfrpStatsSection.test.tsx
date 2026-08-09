// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WfrpStatsSection } from "@/components/npcs/WfrpStatsSection";
import type { CreatureTrait, CreatureType } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const UGRYZIENIE: CreatureTrait = {
  id: "tr-ugryzienie",
  name: "Ugryzienie",
  description: "Atak zębami.",
  takes_value: true,
};
const BRON: CreatureTrait = { id: "tr-bron", name: "Broń", description: "Zadaje obrażenia.", takes_value: true };
const SKRYTY: CreatureTrait = {
  id: "tr-skryty",
  name: "Skryty",
  description: "Dodaje bonus do skradania.",
  takes_value: false,
};
const ALL_TRAITS = [UGRYZIENIE, BRON, SKRYTY];

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
  default_traits: [{ trait_id: UGRYZIENIE.id, value: "+8", source: "template" }],
  suggested_traits: [],
};

const OGRY: CreatureType = {
  id: "ct-ogry",
  category: "ludy_reiklandu",
  subcategory: null,
  name: "Ogry",
  default_attributes: {
    sz: 6,
    ww: 30,
    us: 20,
    s: 45,
    wt: 45,
    i: 10,
    zw: 25,
    zr: 20,
    int: 20,
    sw: 30,
    ogd: 20,
    zyw: 30,
  },
  default_traits: [{ trait_id: BRON.id, value: "+8", source: "template" }],
  suggested_traits: [],
};

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });
}

function installFetchMock() {
  fetchMock.mockImplementation((url: string) => {
    if (url.startsWith("/api/creature-types")) {
      if (url.includes("q=wamp")) return jsonResponse([WAMPIRY]);
      if (url.includes("q=ogr")) return jsonResponse([OGRY]);
      return jsonResponse([WAMPIRY, OGRY]);
    }
    if (url.startsWith("/api/creature-traits")) {
      if (url.includes("q=skry")) return jsonResponse([SKRYTY]);
      return jsonResponse(ALL_TRAITS);
    }
    if (url.startsWith("/api/skills-talents")) {
      return jsonResponse([]);
    }
    return jsonResponse([]);
  });
  vi.stubGlobal("fetch", fetchMock);
}

function openSection() {
  fireEvent.click(screen.getByRole("button", { name: /WFRP4e Stats/i }));
}

async function selectType(query: string, typeName: string) {
  fireEvent.change(screen.getByLabelText("Creature type"), { target: { value: query } });
  const option = await screen.findByRole("button", { name: typeName }, { timeout: 2000 });
  fireEvent.click(option);
}

describe("WfrpStatsSection", () => {
  it("selecting a type on a pristine form applies immediately with no dialog", async () => {
    installFetchMock();
    render(<WfrpStatsSection onChange={vi.fn()} />);
    openSection();

    await selectType("wamp", "Wampiry");

    expect(screen.queryByText(/Replace stats with/)).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("50");
  });

  it("selecting a different type after an edit opens the confirm dialog and only applies on confirm", async () => {
    installFetchMock();
    render(<WfrpStatsSection onChange={vi.fn()} />);
    openSection();
    await selectType("wamp", "Wampiry");

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "77" } });
    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("77");

    await selectType("ogr", "Ogry");
    expect(await screen.findByText(/Replace stats with Ogry/)).toBeTruthy();
    // Not applied yet — the edited value is untouched while the dialog is open.
    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("77");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Replace stats with Ogry/)).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("77");

    await selectType("ogr", "Ogry");
    fireEvent.click(screen.getByRole("button", { name: /Replace with Ogry/ }));
    expect(screen.queryByText(/Replace stats with Ogry/)).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("S").value).toBe("45");
  });

  it("confirming a type overwrite replaces template traits but preserves custom ones", async () => {
    installFetchMock();
    render(<WfrpStatsSection onChange={vi.fn()} />);
    openSection();
    await selectType("wamp", "Wampiry");
    expect(await screen.findByText("Ugryzienie")).toBeTruthy();

    fireEvent.focus(screen.getByLabelText("Add a Creature Trait"));
    fireEvent.change(screen.getByLabelText("Add a Creature Trait"), { target: { value: "skry" } });
    const skrytyOption = await screen.findByRole("button", { name: "Skryty" }, { timeout: 2000 });
    fireEvent.click(skrytyOption);
    expect(await screen.findByText("Skryty")).toBeTruthy();

    await selectType("ogr", "Ogry");
    fireEvent.click(await screen.findByRole("button", { name: /Replace with Ogry/ }));

    expect(await screen.findByText("Broń")).toBeTruthy();
    expect(screen.queryByText("Ugryzienie")).toBeNull();
    expect(screen.getByText("Skryty")).toBeTruthy();
  });
});
