import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Relationship } from "@/types";

interface RelationshipRowProps {
  relationship: Relationship;
  currentNpcId: string;
  partnerName: string; // resolved by the parent from the campaign NPC list
  onDelete: (id: string) => void;
}

export function RelationshipRow({ relationship, currentNpcId, partnerName, onDelete }: RelationshipRowProps) {
  const [confirming, setConfirming] = useState(false);

  // Direction relative to the NPC whose page this is.
  const outgoing = relationship.from_npc_id === currentNpcId;

  // Any click outside the Delete button cancels a pending confirmation.
  useEffect(() => {
    if (!confirming) return;
    const reset = () => {
      setConfirming(false);
    };
    document.addEventListener("click", reset);
    return () => {
      document.removeEventListener("click", reset);
    };
  }, [confirming]);

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    if (confirming) {
      setConfirming(false);
      onDelete(relationship.id);
    } else {
      setConfirming(true);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-xs font-medium text-stone-300/60"
              title={outgoing ? "Outgoing relationship" : "Incoming relationship"}
            >
              {outgoing ? <ArrowRight className="size-3.5" /> : <ArrowLeft className="size-3.5" />}
              {outgoing ? "Outgoing" : "Incoming"}
            </span>
            <h3 className="truncate text-base font-semibold">{partnerName}</h3>
          </div>
          <span className="w-fit rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
            {relationship.type}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            confirming
              ? "border-red-400/60 bg-red-500/30 text-red-100 hover:bg-red-500/40"
              : "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
          )}
        >
          <Trash2 className="size-3.5" />
          {confirming ? "Confirm?" : "Delete"}
        </button>
      </div>

      <p className="text-sm text-stone-300/70">
        {relationship.description ?? <span className="text-stone-300/40 italic">No description</span>}
      </p>
    </div>
  );
}
