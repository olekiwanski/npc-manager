import { describe, expect, it } from "vitest";
import { computeZyw } from "./wfrp-derived-stats";
import type { CreatureTrait, WfrpAttributes, WfrpTraitAssignment } from "@/types";

const ROZMIAR: CreatureTrait = {
  id: "trait-rozmiar",
  name: "Rozmiar",
  description: "Określa współczynnik wielkości i wzór na Żywotność.",
  takes_value: true,
};

const TRAITS_BY_ID = new Map<string, CreatureTrait>([[ROZMIAR.id, ROZMIAR]]);

function sizeTraits(value: string | null): WfrpTraitAssignment[] {
  return value === null ? [] : [{ trait_id: ROZMIAR.id, value, source: "template" }];
}

type Attrs = Pick<WfrpAttributes, "s" | "wt" | "sw">;

interface SeedCase {
  name: string;
  attrs: Attrs;
  size: string | null;
  zyw: number;
}

// Data-driven against context/changes/npc-wfrp4e-stat-block/creature-types-source.md
// (verified 1:1 against the seeded supabase/seed.sql rows). Every entry that carries
// a default `Rozmiar` trait is included, plus a representative sample of entries
// without one, per plan.md Phase 4.
const MATCHING_CASES: SeedCase[] = [
  // No Rozmiar trait — base formula only (×1), sampled across all 6 categories.
  { name: "Ludzie", attrs: { s: 30, wt: 30, sw: 30 }, size: null, zyw: 12 },
  { name: "Krasnoludy", attrs: { s: 30, wt: 40, sw: 50 }, size: null, zyw: 16 },
  { name: "Elfy", attrs: { s: 30, wt: 30, sw: 40 }, size: null, zyw: 13 },
  { name: "Wilki", attrs: { s: 35, wt: 30, sw: 15 }, size: null, zyw: 10 },
  { name: "Orki", attrs: { s: 35, wt: 45, sw: 35 }, size: null, zyw: 14 },
  { name: "Wampiry", attrs: { s: 50, wt: 40, sw: 60 }, size: null, zyw: 19 },
  { name: "Klanbracia", attrs: { s: 30, wt: 30, sw: 20 }, size: null, zyw: 11 },

  // Rozmiar (Duży) — confirmed ×2 across every seeded entry that has it.
  { name: "Ogry", attrs: { s: 45, wt: 45, sw: 30 }, size: "Duży", zyw: 30 },
  { name: "Niedźwiedzie", attrs: { s: 55, wt: 45, sw: 15 }, size: "Duży", zyw: 28 },
  { name: "Bagienne ośmiornice", attrs: { s: 80, wt: 75, sw: 65 }, size: "Duży", zyw: 56 },
  { name: "Półgryfy", attrs: { s: 55, wt: 40, sw: 25 }, size: "Duży", zyw: 30 },
  { name: "Fimiry", attrs: { s: 45, wt: 40, sw: 30 }, size: "Duży", zyw: 30 },
  { name: "Pegazy", attrs: { s: 45, wt: 40, sw: 25 }, size: "Duży", zyw: 28 },
  { name: "Trolle", attrs: { s: 55, wt: 45, sw: 20 }, size: "Duży", zyw: 30 },
  { name: "Varghulfy", attrs: { s: 55, wt: 55, sw: 60 }, size: "Duży", zyw: 42 },
  { name: "Minotaury", attrs: { s: 44, wt: 45, sw: 30 }, size: "Duży", zyw: 30 },
  { name: "Książęta demonów", attrs: { s: 115, wt: 120, sw: 85 }, size: "Duży", zyw: 86 },
  { name: "Szczurogry", attrs: { s: 55, wt: 45, sw: 25 }, size: "Duży", zyw: 30 },

  // Rozmiar (Wielki) — confirmed ×4 across every seeded entry that has it.
  { name: "Bazyliszki", attrs: { s: 55, wt: 55, sw: 15 }, size: "Wielki", zyw: 64 },
  { name: "Smoki", attrs: { s: 65, wt: 65, sw: 85 }, size: "Wielki", zyw: 104 },
  { name: "Olbrzymy", attrs: { s: 65, wt: 55, sw: 25 }, size: "Wielki", zyw: 72 },
  { name: "Gryfy", attrs: { s: 50, wt: 50, sw: 40 }, size: "Wielki", zyw: 76 },
  { name: "Hydry", attrs: { s: 50, wt: 55, sw: 25 }, size: "Wielki", zyw: 68 },
  { name: "Dżabersmoki", attrs: { s: 55, wt: 50, sw: 20 }, size: "Wielki", zyw: 68 },
  { name: "Mantikory", attrs: { s: 55, wt: 55, sw: 35 }, size: "Wielki", zyw: 72 },
  { name: "Wywerny", attrs: { s: 60, wt: 55, sw: 50 }, size: "Wielki", zyw: 84 },
];

describe("computeZyw", () => {
  it.each(MATCHING_CASES)("matches the source Żywotność for $name", ({ attrs, size, zyw }) => {
    expect(computeZyw(attrs, sizeTraits(size), TRAITS_BY_ID)).toBe(zyw);
  });

  it("defaults to a ×1 multiplier when no Rozmiar trait is assigned", () => {
    expect(computeZyw({ s: 30, wt: 30, sw: 30 }, [], TRAITS_BY_ID)).toBe(12);
  });

  it("defaults to a ×1 multiplier for an unrecognized Rozmiar value", () => {
    expect(computeZyw({ s: 30, wt: 30, sw: 30 }, sizeTraits("Średni"), TRAITS_BY_ID)).toBe(12);
  });

  it("ignores traits whose id isn't found in traitsById", () => {
    const orphaned: WfrpTraitAssignment[] = [{ trait_id: "missing", value: "Duży", source: "template" }];
    expect(computeZyw({ s: 30, wt: 30, sw: 30 }, orphaned, TRAITS_BY_ID)).toBe(12);
  });

  // Documented exceptions: the published WFRP4e Bestiary stat blocks aren't all
  // mechanically derived from SB+2TB+WPB×size — some are hand-tuned by the book's
  // authors. These assert the formula's actual (internally consistent) output,
  // which intentionally diverges from the source material's printed Żyw, rather
  // than silently dropping the entries from the test set (per plan.md Phase 4).
  describe("known exceptions where the formula diverges from the printed source Żyw", () => {
    it("Mały/Drobny sizes don't fit a single clean multiplier (no multiplier applied, ×1)", () => {
      // Niziołki: source Żyw 10, formula gives 12 (Mały has no confirmed multiplier).
      expect(computeZyw({ s: 20, wt: 30, sw: 40 }, sizeTraits("Mały"), TRAITS_BY_ID)).toBe(12);
      // Olbrzymie szczury: source Żyw 5, formula gives 8.
      expect(computeZyw({ s: 30, wt: 25, sw: 15 }, sizeTraits("Mały"), TRAITS_BY_ID)).toBe(8);
      // Węże: source Żyw 8, formula gives 11.
      expect(computeZyw({ s: 30, wt: 25, sw: 45 }, sizeTraits("Mały"), TRAITS_BY_ID)).toBe(11);
      // Snotlingi: source Żyw 7, formula gives 9.
      expect(computeZyw({ s: 25, wt: 20, sw: 30 }, sizeTraits("Mały"), TRAITS_BY_ID)).toBe(9);
      // Gołębie (Drobny): source Żyw 1, formula gives 4.
      expect(computeZyw({ s: 5, wt: 15, sw: 20 }, sizeTraits("Drobny"), TRAITS_BY_ID)).toBe(4);
    });

    it("Hipogryfy is labeled Duży in the source but its printed Żyw matches a ×4 (Wielki) scaling, not ×2", () => {
      // Source Żyw 72 = base 18 × 4; our formula applies the confirmed Duży ×2 => 36.
      expect(computeZyw({ s: 55, wt: 50, sw: 35 }, sizeTraits("Duży"), TRAITS_BY_ID)).toBe(36);
    });

    it("undead entries with no Siła Woli characteristic (Konstrukt) don't fit the SW term", () => {
      // Szkielety/Zombi: source Żyw 12, sw seeded as 0 (no SW characteristic), formula gives 9.
      expect(computeZyw({ s: 30, wt: 30, sw: 0 }, [], TRAITS_BY_ID)).toBe(9);
      // Upiorne wilki: source Żyw 24, sw seeded as 0, Rozmiar Duży; formula gives 9 × 2 = 18.
      expect(computeZyw({ s: 35, wt: 35, sw: 0 }, sizeTraits("Duży"), TRAITS_BY_ID)).toBe(18);
    });
  });
});
