import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDebouncedValue } from "@/components/hooks/useDebouncedValue";
import type { CreatureTrait, WfrpTraitAssignment } from "@/types";

interface WfrpTraitsListProps {
  traits: WfrpTraitAssignment[];
  onChange: (traits: WfrpTraitAssignment[]) => void;
}

interface CreatureTraitsResponse {
  data: CreatureTrait[];
}

export function WfrpTraitsList({ traits, onChange }: WfrpTraitsListProps) {
  const [traitsById, setTraitsById] = useState<Map<string, CreatureTrait>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<CreatureTrait[]>([]);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/creature-traits")
      .then((res) => res.json() as Promise<CreatureTraitsResponse>)
      .then((body) => {
        setTraitsById(new Map(body.data.map((trait) => [trait.id, trait])));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    fetch(`/api/creature-traits?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json() as Promise<CreatureTraitsResponse>)
      .then((body) => {
        if (!cancelled) setPickerResults(body.data);
      })
      .catch(() => {
        if (!cancelled) setPickerResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, pickerOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const assignedIds = useMemo(() => new Set(traits.map((t) => t.trait_id)), [traits]);
  const availableResults = useMemo(
    () => pickerResults.filter((trait) => !assignedIds.has(trait.id)),
    [pickerResults, assignedIds],
  );

  function handleAdd(trait: CreatureTrait) {
    onChange([...traits, { trait_id: trait.id, value: null, source: "custom" }]);
    setTraitsById((prev) => (prev.has(trait.id) ? prev : new Map(prev).set(trait.id, trait)));
    setQuery("");
    setPickerOpen(false);
  }

  function handleRemove(traitId: string) {
    onChange(traits.filter((t) => t.trait_id !== traitId));
  }

  function handleValueChange(traitId: string, value: string) {
    onChange(traits.map((t) => (t.trait_id === traitId ? { ...t, value: value === "" ? null : value } : t)));
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {traits.length === 0 && <li className="text-sm text-stone-400">No Creature Traits yet.</li>}
        {traits.map((assignment) => {
          const trait = traitsById.get(assignment.trait_id);
          return (
            <li
              key={assignment.trait_id}
              className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">{trait?.name ?? assignment.trait_id}</span>
                  {assignment.source === "template" ? (
                    <span className="rounded-full bg-blue-900/50 px-2 py-0.5 text-[11px] text-blue-200">Template</span>
                  ) : (
                    <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[11px] text-amber-200">Custom</span>
                  )}
                  {trait?.takes_value && (
                    <input
                      type="text"
                      aria-label={`${trait.name} value`}
                      value={assignment.value ?? ""}
                      onChange={(e) => {
                        handleValueChange(assignment.trait_id, e.target.value);
                      }}
                      placeholder="Value"
                      className="w-28 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white placeholder-white/30 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  )}
                </div>
                {trait?.description && <p className="mt-1 text-xs text-stone-400">{trait.description}</p>}
              </div>
              {assignment.source === "custom" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRemove(assignment.trait_id);
                  }}
                  aria-label={`Remove ${trait?.name ?? "trait"}`}
                  className="shrink-0 text-stone-400 hover:text-red-300"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="relative" ref={containerRef}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPickerOpen(true);
          }}
          onFocus={() => {
            setPickerOpen(true);
          }}
          placeholder="Add a Creature Trait…"
          autoComplete="off"
          aria-label="Add a Creature Trait"
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        {pickerOpen && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/20 bg-stone-900 shadow-lg">
            {availableResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-stone-400">No matching traits</p>
            ) : (
              availableResults.map((trait) => (
                <button
                  key={trait.id}
                  type="button"
                  onClick={() => {
                    handleAdd(trait);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-amber-700/30"
                >
                  {trait.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
