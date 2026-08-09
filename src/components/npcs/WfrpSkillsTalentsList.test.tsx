// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WfrpSkillsTalentsList } from "@/components/npcs/WfrpSkillsTalentsList";
import type { SkillTalent, WfrpSkillTalentAssignment } from "@/types";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const UNIK: SkillTalent = {
  id: "s-unik",
  name: "Unik",
  kind: "skill",
  description: "Unika ciosów.",
  takes_value: false,
};
const SILNY: SkillTalent = {
  id: "t-silny",
  name: "Bardzo Silny",
  kind: "talent",
  description: "Zwiększa Siłę.",
  takes_value: false,
};

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ data }) });
}

describe("WfrpSkillsTalentsList", () => {
  it("every entry is removable", async () => {
    fetchMock.mockImplementation(() => jsonResponse([UNIK, SILNY]));
    const onChange = vi.fn();
    const entries: WfrpSkillTalentAssignment[] = [
      { id: UNIK.id, value: null },
      { id: SILNY.id, value: null },
    ];
    render(<WfrpSkillsTalentsList entries={entries} onChange={onChange} />);

    expect(await screen.findByText("Unik")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Remove Unik"));
    expect(onChange).toHaveBeenCalledWith([{ id: SILNY.id, value: null }]);

    fireEvent.click(screen.getByLabelText("Remove Bardzo Silny"));
    expect(onChange).toHaveBeenCalledWith([{ id: UNIK.id, value: null }]);
  });

  it("adding an entry from the picker appends it", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("q=")) return jsonResponse([UNIK]);
      return jsonResponse([]);
    });
    const onChange = vi.fn();
    render(<WfrpSkillsTalentsList entries={[]} onChange={onChange} />);

    fireEvent.focus(screen.getByLabelText("Add a Skill or Talent"));
    const option = await screen.findByRole("button", { name: "Unik" }, { timeout: 1000 });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith([{ id: UNIK.id, value: null }]);
  });

  it("groups picker results by kind", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("q=")) return jsonResponse([UNIK, SILNY]);
      return jsonResponse([]);
    });
    render(<WfrpSkillsTalentsList entries={[]} onChange={vi.fn()} />);

    fireEvent.focus(screen.getByLabelText("Add a Skill or Talent"));

    expect(await screen.findByText("Skills")).toBeTruthy();
    expect(screen.getByText("Talents")).toBeTruthy();
  });
});
