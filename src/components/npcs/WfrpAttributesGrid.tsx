import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WfrpAttributes } from "@/types";

interface WfrpAttributesGridProps {
  attributes: WfrpAttributes;
  zywOverridden: boolean;
  onChange: (attributes: WfrpAttributes) => void;
  onZywOverrideChange: (overridden: boolean) => void;
}

const NUMERIC_FIELDS: { key: keyof Omit<WfrpAttributes, "zyw">; label: string }[] = [
  { key: "sz", label: "Sz" },
  { key: "ww", label: "WW" },
  { key: "us", label: "US" },
  { key: "s", label: "S" },
  { key: "wt", label: "Wt" },
  { key: "i", label: "I" },
  { key: "zw", label: "Zw" },
  { key: "zr", label: "Zr" },
  { key: "int", label: "Int" },
  { key: "sw", label: "SW" },
  { key: "ogd", label: "Ogd" },
];

function buildRawValues(attributes: WfrpAttributes): Record<string, string> {
  const raw: Record<string, string> = { zyw: String(attributes.zyw) };
  for (const field of NUMERIC_FIELDS) {
    raw[field.key] = String(attributes[field.key]);
  }
  return raw;
}

/**
 * Purely presentational: bounds-validates the 11 Attributes and renders the
 * Żyw lock/unlock affordance. Whether an edit should trigger a live Żyw
 * recalculation is a decision WfrpStatsSection makes (it alone knows whether
 * a given `attributes` update came from a genuine user edit vs. applying a
 * creature type's own authoritative default Żyw) — see WfrpStatsSection.
 */
export function WfrpAttributesGrid({
  attributes,
  zywOverridden,
  onChange,
  onZywOverrideChange,
}: WfrpAttributesGridProps) {
  const [prevAttributes, setPrevAttributes] = useState(attributes);
  const [rawValues, setRawValues] = useState<Record<string, string>>(() => buildRawValues(attributes));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Re-sync the local raw text values whenever the committed attributes change
  // from outside this component (template applied, live Żyw recalculation).
  // Done during render (not an effect) per React's "adjusting state when a
  // prop changes" pattern — avoids an extra commit/paint.
  if (attributes !== prevAttributes) {
    setPrevAttributes(attributes);
    setRawValues(buildRawValues(attributes));
  }

  function handleFieldChange(key: (typeof NUMERIC_FIELDS)[number]["key"], value: string) {
    setRawValues((prev) => ({ ...prev, [key]: value }));

    const parsed = Number(value);
    if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      setErrors((prev) => ({ ...prev, [key]: "Whole number from 0 to 100" }));
      return;
    }
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    onChange({ ...attributes, [key]: parsed });
  }

  function handleZywChange(value: string) {
    setRawValues((prev) => ({ ...prev, zyw: value }));

    const parsed = Number(value);
    if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 0) {
      setErrors((prev) => ({ ...prev, zyw: "Whole number, 0 or more" }));
      return;
    }
    setErrors((prev) => {
      if (!("zyw" in prev)) return prev;
      const { zyw: _removed, ...rest } = prev;
      return rest;
    });
    onChange({ ...attributes, zyw: parsed });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`wfrp-attr-${field.key}`} className="mb-1 block text-xs text-stone-300/80">
              {field.label}
            </label>
            <input
              id={`wfrp-attr-${field.key}`}
              type="text"
              inputMode="numeric"
              value={rawValues[field.key] ?? ""}
              onChange={(e) => {
                handleFieldChange(field.key, e.target.value);
              }}
              className={cn(
                "w-full rounded-lg border bg-white/10 px-2 py-1.5 text-center text-white transition-colors focus:ring-2 focus:outline-none",
                errors[field.key] ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-amber-500",
              )}
            />
            {errors[field.key] && <p className="mt-1 text-[11px] text-red-300">{errors[field.key]}</p>}
          </div>
        ))}
        <div>
          <label htmlFor="wfrp-attr-zyw" className="mb-1 block text-xs text-stone-300/80">
            Żyw
          </label>
          <input
            id="wfrp-attr-zyw"
            type="text"
            inputMode="numeric"
            readOnly={!zywOverridden}
            value={zywOverridden ? rawValues.zyw : String(attributes.zyw)}
            onChange={(e) => {
              handleZywChange(e.target.value);
            }}
            className={cn(
              "w-full rounded-lg border px-2 py-1.5 text-center transition-colors focus:ring-2 focus:outline-none",
              zywOverridden ? "bg-white/10 text-white" : "bg-white/5 text-stone-300",
              errors.zyw ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-amber-500",
            )}
          />
          {errors.zyw && <p className="mt-1 text-[11px] text-red-300">{errors.zyw}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onZywOverrideChange(!zywOverridden);
        }}
        className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
      >
        {zywOverridden ? (
          <>
            <Lock className="size-3" /> Auto-calculate Żywotność
          </>
        ) : (
          <>
            <LockOpen className="size-3" /> Enter Żywotność manually
          </>
        )}
      </button>
    </div>
  );
}
