import { useState } from "react";
import { Plus } from "lucide-react";
import { ServerError } from "@/components/auth/ServerError";
import { NpcCard } from "@/components/npcs/NpcCard";
import type { Npc } from "@/types";

interface NpcListProps {
  initialNpcs: Npc[];
  campaignId: string;
}

interface MutationResponse {
  error?: string;
}

export function NpcList({ initialNpcs, campaignId }: NpcListProps) {
  const [npcs, setNpcs] = useState<Npc[]>(initialNpcs);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (pendingId === id) return;
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/npcs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json()) as MutationResponse;
        setError(payload.error ?? "Failed to delete NPC");
        return;
      }
      setNpcs((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setError("Network error");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="text-white">
      {error ? (
        <div className="mb-4">
          <ServerError message={error} />
        </div>
      ) : null}

      {npcs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
          <p className="mb-4 text-blue-100/70">{"This campaign doesn't have any NPCs yet."}</p>
          <a
            href={`/campaigns/${campaignId}/npcs/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
          >
            <Plus className="size-4" />
            Create your first NPC
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {npcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              campaignId={campaignId}
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
