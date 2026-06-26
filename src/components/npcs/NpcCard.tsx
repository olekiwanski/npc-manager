import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Npc } from "@/types";

interface NpcCardProps {
  npc: Npc;
  campaignId: string;
  onDelete: (id: string) => void;
}

export function NpcCard({ npc, campaignId, onDelete }: NpcCardProps) {
  const [confirming, setConfirming] = useState(false);

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
      onDelete(npc.id);
    } else {
      setConfirming(true);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold break-words">
          <a href={`/campaigns/${campaignId}/npcs/${npc.id}`} className="transition-colors hover:text-amber-200">
            {npc.name}
          </a>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            npc.role ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-stone-300/60",
          )}
        >
          {npc.role ?? "No role"}
        </span>
      </div>

      <p className="mb-4 line-clamp-3 min-h-[1.25rem] text-sm text-stone-300/70">
        {npc.traits ?? <span className="text-stone-300/40 italic">No traits</span>}
      </p>

      <div className="mt-auto flex items-center gap-2">
        <a
          href={`/campaigns/${campaignId}/npcs/${npc.id}/edit`}
          className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
        >
          <Pencil className="size-3.5" />
          Edit
        </a>

        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            confirming
              ? "border-red-400/60 bg-red-500/30 text-red-100 hover:bg-red-500/40"
              : "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
          )}
        >
          <Trash2 className="size-3.5" />
          {confirming ? "Confirm?" : "Delete"}
        </button>
      </div>
    </div>
  );
}
