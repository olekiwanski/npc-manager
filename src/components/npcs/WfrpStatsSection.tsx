import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CreatureTypeSelect } from "@/components/npcs/CreatureTypeSelect";
import { ConfirmOverwriteDialog } from "@/components/npcs/ConfirmOverwriteDialog";
import { WfrpAttributesGrid } from "@/components/npcs/WfrpAttributesGrid";
import { WfrpTraitsList } from "@/components/npcs/WfrpTraitsList";
import { WfrpSkillsTalentsList } from "@/components/npcs/WfrpSkillsTalentsList";
import { computeZyw } from "@/lib/wfrp-derived-stats";
import type {
  CreatureTrait,
  CreatureType,
  Npc,
  WfrpAttributes,
  WfrpSkillTalentAssignment,
  WfrpTraitAssignment,
} from "@/types";

export interface WfrpStateBlock {
  wfrp_creature_type_id: string | null;
  wfrp_attributes: WfrpAttributes | null;
  wfrp_traits: WfrpTraitAssignment[];
  wfrp_skills_talents: WfrpSkillTalentAssignment[];
  wfrp_zyw_overridden: boolean;
}

interface WfrpStatsSectionProps {
  npc?: Npc; // undefined = create mode, seeds initial state from npc.wfrp_* when present
  onChange: (block: WfrpStateBlock) => void; // lifts the combined state up to NpcForm
}

interface CreatureTraitsResponse {
  data: CreatureTrait[];
}

function findRozmiarValue(traits: WfrpTraitAssignment[], traitsById: Map<string, CreatureTrait>): string | null {
  const assignment = traits.find((t) => traitsById.get(t.trait_id)?.name === "Rozmiar");
  return assignment?.value ?? null;
}

export function WfrpStatsSection({ npc, onChange }: WfrpStatsSectionProps) {
  const [open, setOpen] = useState(() => npc?.wfrp_attributes != null);
  const [creatureTypeId, setCreatureTypeId] = useState<string | null>(npc?.wfrp_creature_type_id ?? null);
  const [attributes, setAttributes] = useState<WfrpAttributes | null>(npc?.wfrp_attributes ?? null);
  const [traits, setTraits] = useState<WfrpTraitAssignment[]>(npc?.wfrp_traits ?? []);
  const [skillsTalents, setSkillsTalents] = useState<WfrpSkillTalentAssignment[]>(npc?.wfrp_skills_talents ?? []);
  const [zywOverridden, setZywOverridden] = useState(npc?.wfrp_zyw_overridden ?? false);
  const [touched, setTouched] = useState(false);
  const [pendingType, setPendingType] = useState<CreatureType | null>(null);
  const [traitsById, setTraitsById] = useState<Map<string, CreatureTrait>>(new Map());

  // Needed here (rather than left to WfrpTraitsList's own copy) to resolve the
  // Rozmiar trait for live Żywotność recalculation. Deferred until the section
  // is actually opened so NPCs that never touch WFRP stats (the common case)
  // don't pay for this fetch.
  useEffect(() => {
    if (!open) return;
    fetch("/api/creature-traits")
      .then((res) => res.json() as Promise<CreatureTraitsResponse>)
      .then((body) => {
        setTraitsById(new Map(body.data.map((trait) => [trait.id, trait])));
      })
      .catch(() => undefined);
  }, [open]);

  function emit(next: {
    creatureTypeId: string | null;
    attributes: WfrpAttributes | null;
    traits: WfrpTraitAssignment[];
    skillsTalents: WfrpSkillTalentAssignment[];
    zywOverridden: boolean;
  }) {
    onChange({
      wfrp_creature_type_id: next.creatureTypeId,
      wfrp_attributes: next.attributes,
      wfrp_traits: next.traits,
      wfrp_skills_talents: next.skillsTalents,
      wfrp_zyw_overridden: next.zywOverridden,
    });
  }

  function applyType(type: CreatureType) {
    const customTraits = traits.filter((t) => t.source === "custom");
    const templateTraits: WfrpTraitAssignment[] = type.default_traits.map((assignment) => ({
      trait_id: assignment.trait_id,
      value: assignment.value,
      source: "template",
    }));
    const nextTraits = [...templateTraits, ...customTraits];
    // Trust the catalog's own printed Żyw as-is — it's the authoritative source
    // value, not necessarily what computeZyw would derive (see the documented
    // formula exceptions in wfrp-derived-stats.test.ts).
    const nextAttributes = type.default_attributes;

    setOpen(true);
    setCreatureTypeId(type.id);
    setAttributes(nextAttributes);
    setTraits(nextTraits);
    setZywOverridden(false);
    setTouched(false);
    setPendingType(null);

    emit({
      creatureTypeId: type.id,
      attributes: nextAttributes,
      traits: nextTraits,
      skillsTalents,
      zywOverridden: false,
    });
  }

  function handleTypeSelect(type: CreatureType) {
    if (touched) {
      setPendingType(type);
    } else {
      applyType(type);
    }
  }

  function handleAttributesChange(next: WfrpAttributes) {
    let finalAttributes = next;
    if (!zywOverridden && attributes) {
      const relevantChanged = next.s !== attributes.s || next.wt !== attributes.wt || next.sw !== attributes.sw;
      if (relevantChanged) {
        finalAttributes = { ...next, zyw: computeZyw(next, traits, traitsById) };
      }
    }
    setAttributes(finalAttributes);
    setTouched(true);
    emit({ creatureTypeId, attributes: finalAttributes, traits, skillsTalents, zywOverridden });
  }

  function handleTraitsChange(next: WfrpTraitAssignment[]) {
    let finalAttributes = attributes;
    if (!zywOverridden && attributes) {
      const rozmiarChanged = findRozmiarValue(traits, traitsById) !== findRozmiarValue(next, traitsById);
      if (rozmiarChanged) {
        finalAttributes = { ...attributes, zyw: computeZyw(attributes, next, traitsById) };
      }
    }
    setTraits(next);
    setTouched(true);
    if (finalAttributes !== attributes) setAttributes(finalAttributes);
    emit({ creatureTypeId, attributes: finalAttributes, traits: next, skillsTalents, zywOverridden });
  }

  function handleSkillsChange(next: WfrpSkillTalentAssignment[]) {
    setSkillsTalents(next);
    setTouched(true);
    emit({ creatureTypeId, attributes, traits, skillsTalents: next, zywOverridden });
  }

  function handleZywOverrideChange(overridden: boolean) {
    let finalAttributes = attributes;
    if (!overridden && attributes) {
      // Re-locking recalculates fresh from the current Attributes/Rozmiar.
      finalAttributes = { ...attributes, zyw: computeZyw(attributes, traits, traitsById) };
      setAttributes(finalAttributes);
    }
    setZywOverridden(overridden);
    setTouched(true);
    emit({ creatureTypeId, attributes: finalAttributes, traits, skillsTalents, zywOverridden: overridden });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-200"
      >
        WFRP4e Stats
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          <CreatureTypeSelect value={creatureTypeId} onSelect={handleTypeSelect} />

          {attributes && (
            <>
              <div>
                <h4 className="mb-2 text-xs font-medium tracking-wide text-stone-400 uppercase">Attributes</h4>
                <WfrpAttributesGrid
                  attributes={attributes}
                  zywOverridden={zywOverridden}
                  onChange={handleAttributesChange}
                  onZywOverrideChange={handleZywOverrideChange}
                />
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium tracking-wide text-stone-400 uppercase">Creature Traits</h4>
                <WfrpTraitsList traits={traits} onChange={handleTraitsChange} />
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium tracking-wide text-stone-400 uppercase">
                  Skills &amp; Talents
                </h4>
                <WfrpSkillsTalentsList entries={skillsTalents} onChange={handleSkillsChange} />
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmOverwriteDialog
        open={pendingType !== null}
        newTypeName={pendingType?.name ?? ""}
        onConfirm={() => {
          if (pendingType) applyType(pendingType);
        }}
        onCancel={() => {
          setPendingType(null);
        }}
      />
    </div>
  );
}
