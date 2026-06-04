-- Create campaigns table for the campaigns CRUD slice (S-01).
-- Per-user data isolation is enforced via RLS with one policy per operation.

-- moddatetime provides a reusable trigger to keep updated_at current on UPDATE.
create extension if not exists moddatetime schema extensions;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index the columns the list query filters on (user_id is implicit via RLS,
-- but a real predicate is emitted; status narrows active vs archived).
create index campaigns_user_id_status_idx on public.campaigns (user_id, status);

-- Keep updated_at fresh on every row update.
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row
  execute function extensions.moddatetime (updated_at);

-- Row Level Security: every operation is scoped to the owning user.
alter table public.campaigns enable row level security;

create policy campaigns_select_own
  on public.campaigns
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy campaigns_insert_own
  on public.campaigns
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy campaigns_update_own
  on public.campaigns
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy campaigns_delete_own
  on public.campaigns
  for delete
  to authenticated
  using (auth.uid() = user_id);
