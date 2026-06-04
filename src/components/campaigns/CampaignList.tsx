import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServerError } from "@/components/auth/ServerError";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import type { Campaign } from "@/types";

interface CampaignListProps {
  initialCampaigns: Campaign[];
}

interface ListResponse {
  data?: Campaign[];
  error?: string;
}

interface MutationResponse {
  error?: string;
}

export function CampaignList({ initialCampaigns }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initialCampaigns is the immutable SSR snapshot; never repaint from it after
  // a mutation. Switching filters always re-fetches the relevant status list.
  async function loadStatus(archived: boolean) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns?status=${archived ? "archived" : "active"}`);
      const body = (await res.json()) as ListResponse;
      if (!res.ok) {
        setError(body.error ?? "Failed to load campaigns");
        return;
      }
      setCampaigns(body.data ?? []);
    } catch {
      setError("Network error while loading campaigns");
    } finally {
      setIsLoading(false);
    }
  }

  function selectFilter(archived: boolean) {
    if (archived === showArchived) return;
    setShowArchived(archived);
    void loadStatus(archived);
  }

  async function mutate(id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const payload = (await res.json()) as MutationResponse;
        setError(payload.error ?? "Action failed");
        return;
      }
      // Remove the affected card from the current view (it no longer belongs to
      // the active or archived list being shown).
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Network error");
    }
  }

  const handleArchive = (id: string) => void mutate(id, "PATCH", { status: "archived" });
  const handleUnarchive = (id: string) => void mutate(id, "PATCH", { status: "active" });
  const handleDelete = (id: string) => void mutate(id, "DELETE");

  return (
    <div className="text-white">
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
        {(
          [
            { label: "Active", archived: false },
            { label: "Archived", archived: true },
          ] as const
        ).map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              selectFilter(tab.archived);
            }}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              showArchived === tab.archived ? "bg-purple-600 text-white" : "text-blue-100/70 hover:text-white",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <ServerError message={error} />
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-blue-100/60">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
          <p className="mb-4 text-blue-100/70">
            {showArchived ? "No archived campaigns." : "You don't have any campaigns yet."}
          </p>
          {!showArchived ? (
            <a
              href="/campaigns/new"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
            >
              <Plus className="size-4" />
              Create your first campaign
            </a>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
