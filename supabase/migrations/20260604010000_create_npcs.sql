-- Create npcs table for the NPC CRUD slice (S-02).
-- NPCs are a nested resource under a campaign. Per-user data isolation is
-- enforced via RLS with one policy per operation; the insert policy also
-- blocks attaching an NPC to a campaign the user does not own.

-- moddatetime provides a reusable trigger to keep updated_at current on UPDATE.
-- Already created by the campaigns migration; re-issued idempotently here.
create extension if not exists moddatetime schema extensions;

create table public.npcs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  role text,
  traits text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The list query filters NPCs by their parent campaign.
create index npcs_campaign_id_idx on public.npcs (campaign_id);

-- Keep updated_at fresh on every row update.
create trigger npcs_set_updated_at
  before update on public.npcs
  for each row
  execute function extensions.moddatetime (updated_at);

-- Row Level Security: every operation is scoped to the owning user.
alter table public.npcs enable row level security;

create policy npcs_select_own
  on public.npcs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- The campaign-ownership subquery prevents attaching an NPC to a foreign
-- campaign; the subquery is itself RLS-filtered so it can only see the
-- caller's own campaigns.
create policy npcs_insert_own
  on public.npcs
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and campaign_id in (select id from public.campaigns where user_id = auth.uid())
  );

create policy npcs_update_own
  on public.npcs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy npcs_delete_own
  on public.npcs
  for delete
  to authenticated
  using (auth.uid() = user_id);
