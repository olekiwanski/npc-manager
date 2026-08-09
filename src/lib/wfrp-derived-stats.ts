import type { CreatureTrait, WfrpAttributes, WfrpTraitAssignment } from "@/types";

/**
 * Multiplier applied to the base Żywotność formula, keyed by the `Rozmiar` trait's
 * assigned value. Only `Duży` (×2) and `Wielki` (×4) are confirmed against every
 * seeded creature_types entry that carries them. Small sizes (`Mały`, `Drobny`) do
 * not fit a single clean multiplier across the seeded data — see
 * wfrp-derived-stats.test.ts for the documented exceptions — so they intentionally
 * fall through to the ×1 default rather than guessing a value.
 */
const SIZE_MULTIPLIERS: Record<string, number> = {
  Duży: 2,
  Wielki: 4,
};

/**
 * Computes Żywotność from Siła, Wytrzymałość, and Siła Woli: floor(S/10) +
 * 2×floor(Wt/10) + floor(SW/10), scaled by the size multiplier resolved from the
 * `Rozmiar` trait assignment, if present.
 */
export function computeZyw(
  attributes: Pick<WfrpAttributes, "s" | "wt" | "sw">,
  traits: WfrpTraitAssignment[],
  traitsById: Map<string, CreatureTrait>,
): number {
  const base = Math.floor(attributes.s / 10) + 2 * Math.floor(attributes.wt / 10) + Math.floor(attributes.sw / 10);

  const sizeAssignment = traits.find((assignment) => traitsById.get(assignment.trait_id)?.name === "Rozmiar");
  const multiplier = sizeAssignment?.value ? (SIZE_MULTIPLIERS[sizeAssignment.value] ?? 1) : 1;

  return base * multiplier;
}
