import { useState } from "react";
import { Users, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { RelationshipRow } from "@/components/relationships/RelationshipRow";
import type { Npc, Relationship } from "@/types";

interface RelationshipSectionProps {
  npcId: string;
  campaignId: string;
  campaignNpcs: Npc[]; // all NPCs in the campaign (incl. current) — picker + name resolution
  initialRelationships: Relationship[]; // rows where from_npc_id or to_npc_id === npcId
}

interface MutationResponse {
  error?: string;
}

const TYPE_MAX = 100;
const DESCRIPTION_MAX = 2000;

export function RelationshipSection({
  npcId,
  campaignId,
  campaignNpcs,
  initialRelationships,
}: RelationshipSectionProps) {
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const eligiblePartners = campaignNpcs.filter((n) => n.id !== npcId);

  const [partnerId, setPartnerId] = useState(eligiblePartners[0]?.id ?? "");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ partnerId?: string; type?: string; description?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function nameFor(id: string): string {
    return campaignNpcs.find((n) => n.id === id)?.name ?? "Unknown NPC";
  }

  function validate() {
    const next: typeof errors = {};
    if (!partnerId) {
      next.partnerId = "Select an NPC to link to";
    }
    if (!type.trim()) {
      next.type = "Type is required";
    } else if (type.length > TYPE_MAX) {
      next.type = `Type must be ${String(TYPE_MAX)} characters or fewer`;
    }
    if (description.length > DESCRIPTION_MAX) {
      next.description = `Description must be ${String(DESCRIPTION_MAX)} characters or fewer`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;

    const trimmedDescription = description.trim();
    const payload = {
      campaign_id: campaignId,
      from_npc_id: npcId,
      to_npc_id: partnerId,
      type: type.trim(),
      description: trimmedDescription ? trimmedDescription : null,
    };

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as MutationResponse;
        setServerError(body.error ?? "Something went wrong");
        return;
      }
      const body = (await res.json()) as { data: Relationship };
      setRelationships((prev) => [...prev, body.data]);
      setType("");
      setDescription("");
      setPartnerId(eligiblePartners[0]?.id ?? "");
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    if (pendingDeleteId === id) return;
    setServerError(null);
    setPendingDeleteId(id);
    try {
      const res = await fetch(`/api/relationships/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as MutationResponse;
        setServerError(body.error ?? "Failed to delete relationship");
        return;
      }
      setRelationships((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  const hasPartners = eligiblePartners.length > 0;

  return (
    <div className="text-white">
      {hasPartners ? (
        <form action={handleSubmit} className="mb-6 space-y-4" noValidate>
          <div>
            <label htmlFor="partner" className="mb-1 block text-sm text-blue-100/80">
              Linked NPC
            </label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40">
                <Users className="size-4" />
              </span>
              <select
                id="partner"
                name="partner"
                value={partnerId}
                onChange={(e) => {
                  setPartnerId(e.target.value);
                  if (errors.partnerId) setErrors((prev) => ({ ...prev, partnerId: undefined }));
                }}
                className={cn(
                  "w-full appearance-none rounded-lg border bg-white/10 px-3 py-2 pl-10 text-white transition-colors focus:ring-2 focus:outline-none",
                  errors.partnerId ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
                )}
              >
                {eligiblePartners.map((npc) => (
                  <option key={npc.id} value={npc.id} className="bg-slate-800">
                    {npc.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.partnerId ? <p className="mt-1 text-xs text-red-300">{errors.partnerId}</p> : null}
          </div>

          <FormField
            id="type"
            label="Type"
            value={type}
            onChange={(v) => {
              setType(v);
              if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
            }}
            placeholder="Ally, rival, mentor…"
            error={errors.type}
            icon={<Link2 className="size-4" />}
          />

          <div>
            <label htmlFor="description" className="mb-1 block text-sm text-blue-100/80">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="How are they connected?"
              rows={3}
              className={cn(
                "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:ring-2 focus:outline-none",
                errors.description ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
              )}
            />
            {errors.description ? (
              <p className="mt-1 text-xs text-red-300">{errors.description}</p>
            ) : (
              <p className="mt-1 text-xs text-blue-100/40">
                {description.length}/{DESCRIPTION_MAX}
              </p>
            )}
          </div>

          <ServerError message={serverError} />

          <SubmitButton pendingText="Adding…" icon={<Link2 className="size-4" />}>
            Add relationship
          </SubmitButton>
        </form>
      ) : (
        <p className="mb-6 rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-2 text-sm text-blue-100/60">
          Add another NPC to this campaign to create relationships.
        </p>
      )}

      {!hasPartners && serverError ? (
        <div className="mb-4">
          <ServerError message={serverError} />
        </div>
      ) : null}

      {relationships.length === 0 ? (
        <p className="text-sm text-blue-100/40 italic">No relationships yet.</p>
      ) : (
        <div className="space-y-3">
          {relationships.map((relationship) => (
            <RelationshipRow
              key={relationship.id}
              relationship={relationship}
              currentNpcId={npcId}
              partnerName={nameFor(
                relationship.from_npc_id === npcId ? relationship.to_npc_id : relationship.from_npc_id,
              )}
              onDelete={(id) => {
                void handleDelete(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
