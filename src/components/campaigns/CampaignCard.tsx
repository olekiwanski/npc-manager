import { useEffect, useState } from "react";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types";

type ConfirmAction = "archive" | "unarchive" | "delete";

interface CampaignCardProps {
  campaign: Campaign;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignCard({ campaign, onArchive, onUnarchive, onDelete }: CampaignCardProps) {
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);

  // Any click outside an action button cancels a pending confirmation.
  // stopPropagation in handle() prevents this listener from firing on the same click that set confirming.
  useEffect(() => {
    if (!confirming) return;
    const reset = () => {
      setConfirming(null);
    };
    document.addEventListener("click", reset);
    return () => {
      document.removeEventListener("click", reset);
    };
  }, [confirming]);

  function handle(action: ConfirmAction, callback: (id: string) => void) {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      if (confirming === action) {
        setConfirming(null);
        callback(campaign.id);
      } else {
        setConfirming(action);
      }
    };
  }

  const isArchived = campaign.status === "archived";

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold break-words">
          <a href={`/campaigns/${campaign.id}`} className="transition-colors hover:text-amber-200">
            {campaign.name}
          </a>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            isArchived ? "bg-white/10 text-stone-300/60" : "bg-amber-500/20 text-amber-200",
          )}
        >
          {isArchived ? "Archived" : "Active"}
        </span>
      </div>

      <p className="mb-4 line-clamp-3 min-h-[1.25rem] text-sm text-stone-300/70">
        {campaign.description ?? <span className="text-stone-300/40 italic">No description</span>}
      </p>

      <div className="mt-auto flex items-center gap-2">
        <a
          href={`/campaigns/${campaign.id}/edit`}
          className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
        >
          <Pencil className="size-3.5" />
          Edit
        </a>

        {isArchived ? (
          <button
            type="button"
            onClick={handle("unarchive", onUnarchive)}
            className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
          >
            <ArchiveRestore className="size-3.5" />
            {confirming === "unarchive" ? "Confirm?" : "Unarchive"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handle("archive", onArchive)}
            className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
          >
            <Archive className="size-3.5" />
            {confirming === "archive" ? "Confirm?" : "Archive"}
          </button>
        )}

        <button
          type="button"
          onClick={handle("delete", onDelete)}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            confirming === "delete"
              ? "border-red-400/60 bg-red-500/30 text-red-100 hover:bg-red-500/40"
              : "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
          )}
        >
          <Trash2 className="size-3.5" />
          {confirming === "delete" ? "Confirm?" : "Delete"}
        </button>
      </div>
    </div>
  );
}
