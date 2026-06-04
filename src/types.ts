// Shared entity and DTO types for the application.

/** A campaign owned by a single game master. Mirrors the `campaigns` DB row. */
export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

/** Payload for creating a campaign (POST /api/campaigns). */
export interface CreateCampaignDto {
  name: string;
  description?: string | null;
}

/** Payload for updating a campaign (PATCH /api/campaigns/[id]). */
export interface UpdateCampaignDto {
  name?: string;
  description?: string | null;
  status?: "active" | "archived";
}

/** An NPC belonging to a single campaign. Mirrors the `npcs` DB row. */
export interface Npc {
  id: string;
  user_id: string;
  campaign_id: string;
  name: string;
  role: string | null;
  traits: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload for creating an NPC (POST /api/npcs). */
export interface CreateNpcDto {
  campaign_id: string;
  name: string;
  role?: string | null;
  traits?: string | null;
}

/** Payload for updating an NPC (PATCH /api/npcs/[id]). */
export interface UpdateNpcDto {
  name?: string;
  role?: string | null;
  traits?: string | null;
}

/**
 * A directed relationship between two NPCs within one campaign. Mirrors the
 * `npc_has_npc` DB row. Rows are immutable after creation (no edit path), so
 * there is no `updated_at`.
 */
export interface Relationship {
  id: string;
  user_id: string;
  campaign_id: string;
  from_npc_id: string;
  to_npc_id: string;
  type: string;
  description: string | null;
  created_at: string;
}

/** Payload for creating a relationship (POST /api/relationships). No update DTO — there is no edit path. */
export interface CreateRelationshipDto {
  campaign_id: string;
  from_npc_id: string;
  to_npc_id: string;
  type: string;
  description?: string | null;
}
