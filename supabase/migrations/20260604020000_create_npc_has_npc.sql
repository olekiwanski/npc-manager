-- Create npc_has_npc junction table for the NPC Relationships slice (S-03).
-- A relationship is a directed link between two NPCs within one campaign, with a
-- free-text type and optional description. Rows are immutable after creation
-- (create + delete only, no edit) so there is no updated_at / moddatetime trigger.
-- Per-user data isolation is enforced via RLS with one policy per operation; the
-- insert policy also enforces the same-campaign / both-NPC-owned invariant.

create table public.npc_has_npc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  from_npc_id uuid not null references public.npcs (id) on delete cascade,
  to_npc_id uuid not null references public.npcs (id) on delete cascade,
  type text not null,
  description text,
  created_at timestamptz not null default now(),
  -- A relationship cannot link an NPC to itself.
  check (from_npc_id <> to_npc_id)
);

-- The "either endpoint" view query filters on both columns via OR, so index each
-- so the planner can bitmap both sides.
create index npc_has_npc_from_idx on public.npc_has_npc (from_npc_id);
create index npc_has_npc_to_idx on public.npc_has_npc (to_npc_id);

-- Row Level Security: every operation is scoped to the owning user.
alter table public.npc_has_npc enable row level security;

create policy npc_has_npc_select_own
  on public.npc_has_npc
  for select
  to authenticated
  using (auth.uid() = user_id);

-- The campaign- and NPC-ownership subqueries enforce both ownership and the
-- same-campaign invariant: a relationship can only join two NPCs that both
-- belong to a campaign the caller owns. Each subquery is itself RLS-filtered so
-- it can only see the caller's own rows.
create policy npc_has_npc_insert_own
  on public.npc_has_npc
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and campaign_id in (select id from public.campaigns where user_id = auth.uid())
    and from_npc_id in (
      select id from public.npcs
      where campaign_id = npc_has_npc.campaign_id and user_id = auth.uid()
    )
    and to_npc_id in (
      select id from public.npcs
      where campaign_id = npc_has_npc.campaign_id and user_id = auth.uid()
    )
  );

create policy npc_has_npc_delete_own
  on public.npc_has_npc
  for delete
  to authenticated
  using (auth.uid() = user_id);
