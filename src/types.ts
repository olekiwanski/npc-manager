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

/** The 12 WFRP4e Attributes (Cechy) tracked per NPC and per creature type template. */
export interface WfrpAttributes {
  sz: number;
  ww: number;
  us: number;
  s: number;
  wt: number;
  i: number;
  zw: number;
  zr: number;
  int: number;
  sw: number;
  ogd: number;
  zyw: number;
}

/** A dictionary entry from the WFRP4e Creature Traits (Cechy Stworzeń) appendix. Mirrors the `creature_traits` DB row. */
export interface CreatureTrait {
  id: string;
  name: string;
  description: string;
  takes_value: boolean;
}

/** A dictionary entry from the WFRP4e Skills/Talents list. Mirrors the `skills_talents` DB row. */
export interface SkillTalent {
  id: string;
  name: string;
  kind: "skill" | "talent";
  description: string;
  takes_value: boolean;
}

/** A Creature Trait assigned to an NPC (or a creature type's defaults), referencing the `creature_traits` dictionary by id. */
export interface WfrpTraitAssignment {
  trait_id: string;
  value: string | null;
  source: "template" | "custom";
}

/** A Skill/Talent assigned to an NPC, referencing the `skills_talents` dictionary by id. */
export interface WfrpSkillTalentAssignment {
  id: string;
  value: string | null;
}

/** A Bestiary catalog entry (creature category + type) with its default stat block. Mirrors the `creature_types` DB row. */
export interface CreatureType {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  default_attributes: WfrpAttributes;
  default_traits: WfrpTraitAssignment[];
  suggested_traits: WfrpTraitAssignment[];
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
  wfrp_creature_type_id: string | null;
  wfrp_attributes: WfrpAttributes | null;
  wfrp_traits: WfrpTraitAssignment[];
  wfrp_skills_talents: WfrpSkillTalentAssignment[];
  wfrp_zyw_overridden: boolean;
}

/** Payload for creating an NPC (POST /api/npcs). */
export interface CreateNpcDto {
  campaign_id: string;
  name: string;
  role?: string | null;
  traits?: string | null;
  wfrp_creature_type_id?: string | null;
  wfrp_attributes?: WfrpAttributes | null;
  wfrp_traits?: WfrpTraitAssignment[] | null;
  wfrp_skills_talents?: WfrpSkillTalentAssignment[] | null;
  wfrp_zyw_overridden?: boolean | null;
}

/** Payload for updating an NPC (PATCH /api/npcs/[id]). */
export interface UpdateNpcDto {
  name?: string;
  role?: string | null;
  traits?: string | null;
  wfrp_creature_type_id?: string | null;
  wfrp_attributes?: WfrpAttributes | null;
  wfrp_traits?: WfrpTraitAssignment[] | null;
  wfrp_skills_talents?: WfrpSkillTalentAssignment[] | null;
  wfrp_zyw_overridden?: boolean | null;
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
