import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/components/hooks/useDebouncedValue";
import type { CreatureType } from "@/types";

interface CreatureTypeSelectProps {
  value: string | null; // selected creature_type id
  onSelect: (type: CreatureType) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ludy_reiklandu: "Ludy Reiklandu",
  zwierzyniec_reiklandu: "Zwierzyniec Reiklandu",
  potworne_bestie_reiklandu: "Potworne Bestie Reiklandu",
  hordy_zielonoskorych: "Hordy Zielonoskórych",
  niespokojni_umarli: "Niespokojni Umarli",
  niewolnicy_ciemnosci: "Niewolnicy Ciemności",
};

interface CreatureTypesResponse {
  data: CreatureType[];
}

export function CreatureTypeSelect({ value, onSelect }: CreatureTypeSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CreatureType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the currently-selected type's name once, e.g. when editing an
  // existing NPC that already has a wfrp_creature_type_id.
  useEffect(() => {
    if (!value || selectedName) return;
    let cancelled = false;
    fetch("/api/creature-types")
      .then((res) => res.json() as Promise<CreatureTypesResponse>)
      .then((body) => {
        if (cancelled) return;
        const match = body.data.find((type) => type.id === value);
        if (match) setSelectedName(match.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value, selectedName]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/creature-types?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json() as Promise<CreatureTypesResponse>)
      .then((body) => {
        if (!cancelled) setResults(body.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, CreatureType[]>();
    for (const type of results) {
      const list = map.get(type.category) ?? [];
      list.push(type);
      map.set(type.category, list);
    }
    return map;
  }, [results]);

  function handleSelect(type: CreatureType) {
    setSelectedName(type.name);
    setQuery("");
    setOpen(false);
    onSelect(type);
  }

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor="creature-type-search" className="mb-1 block text-sm text-stone-300/80">
        Creature type
      </label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
        <input
          id="creature-type-search"
          type="text"
          value={open ? query : (selectedName ?? query)}
          onChange={(e) => {
            setQuery(e.target.value);
            setLoading(true);
            setOpen(true);
          }}
          onFocus={() => {
            setLoading(true);
            setOpen(true);
          }}
          placeholder="Search Bestiary catalog…"
          autoComplete="off"
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 pl-10 text-white placeholder-white/40 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/20 bg-stone-900 shadow-lg">
          {loading && <p className="px-3 py-2 text-sm text-stone-400">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-stone-400">No creature types found</p>
          )}
          {[...grouped.entries()].map(([category, types]) => (
            <div key={category}>
              <p className="bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-stone-400 uppercase">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              {types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    handleSelect(type);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-amber-700/30"
                >
                  {type.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
