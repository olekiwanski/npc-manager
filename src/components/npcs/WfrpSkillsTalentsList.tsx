import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDebouncedValue } from "@/components/hooks/useDebouncedValue";
import type { SkillTalent, WfrpSkillTalentAssignment } from "@/types";

interface WfrpSkillsTalentsListProps {
  entries: WfrpSkillTalentAssignment[];
  onChange: (entries: WfrpSkillTalentAssignment[]) => void;
}

interface SkillsTalentsResponse {
  data: SkillTalent[];
}

const KIND_LABELS: Record<SkillTalent["kind"], string> = {
  skill: "Skills",
  talent: "Talents",
};

export function WfrpSkillsTalentsList({ entries, onChange }: WfrpSkillsTalentsListProps) {
  const [dictionary, setDictionary] = useState<Map<string, SkillTalent>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<SkillTalent[]>([]);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/skills-talents")
      .then((res) => res.json() as Promise<SkillsTalentsResponse>)
      .then((body) => {
        setDictionary(new Map(body.data.map((entry) => [entry.id, entry])));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    fetch(`/api/skills-talents?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json() as Promise<SkillsTalentsResponse>)
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

  const assignedIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  const groupedResults = useMemo(() => {
    const map = new Map<SkillTalent["kind"], SkillTalent[]>();
    for (const item of pickerResults) {
      if (assignedIds.has(item.id)) continue;
      const list = map.get(item.kind) ?? [];
      list.push(item);
      map.set(item.kind, list);
    }
    return map;
  }, [pickerResults, assignedIds]);

  function handleAdd(item: SkillTalent) {
    onChange([...entries, { id: item.id, value: null }]);
    setDictionary((prev) => (prev.has(item.id) ? prev : new Map(prev).set(item.id, item)));
    setQuery("");
    setPickerOpen(false);
  }

  function handleRemove(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  function handleValueChange(id: string, value: string) {
    onChange(entries.map((e) => (e.id === id ? { ...e, value: value === "" ? null : value } : e)));
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {entries.length === 0 && <li className="text-sm text-stone-400">No Skills or Talents yet.</li>}
        {entries.map((entry) => {
          const item = dictionary.get(entry.id);
          return (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">{item?.name ?? entry.id}</span>
                  {item && (
                    <span className="rounded-full bg-stone-700/60 px-2 py-0.5 text-[11px] text-stone-200 capitalize">
                      {item.kind}
                    </span>
                  )}
                  {item?.takes_value && (
                    <input
                      type="text"
                      aria-label={`${item.name} value`}
                      value={entry.value ?? ""}
                      onChange={(e) => {
                        handleValueChange(entry.id, e.target.value);
                      }}
                      placeholder="Value"
                      className="w-28 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white placeholder-white/30 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  )}
                </div>
                {item?.description && <p className="mt-1 text-xs text-stone-400">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  handleRemove(entry.id);
                }}
                aria-label={`Remove ${item?.name ?? "entry"}`}
                className="shrink-0 text-stone-400 hover:text-red-300"
              >
                <X className="size-4" />
              </button>
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
          placeholder="Add a Skill or Talent…"
          autoComplete="off"
          aria-label="Add a Skill or Talent"
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        {pickerOpen && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/20 bg-stone-900 shadow-lg">
            {groupedResults.size === 0 ? (
              <p className="px-3 py-2 text-sm text-stone-400">No matching skills or talents</p>
            ) : (
              [...groupedResults.entries()].map(([kind, items]) => (
                <div key={kind}>
                  <p className="bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-stone-400 uppercase">
                    {KIND_LABELS[kind]}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        handleAdd(item);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-amber-700/30"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
