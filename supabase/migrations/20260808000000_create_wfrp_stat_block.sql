-- Add the WFRP4e Bestiary catalog as shared, public-read reference data, and
-- extend npcs with nullable columns for the optional WFRP4e stat block.
--
-- Unlike every existing table in this project, creature_traits, skills_talents,
-- and creature_types have no owner: they are seeded via supabase/seed.sql (a
-- migration follow-up), not created by users. Each gets exactly one RLS
-- policy -- SELECT for authenticated -- and no INSERT/UPDATE/DELETE policy for
-- any role but the table owner, which is what makes "no catalog editor UI"
-- structurally true rather than just a UI omission.
--
-- npcs gains new nullable/defaulted columns only; the existing four
-- per-operation RLS policies already gate the whole row by user_id, so no
-- RLS change is needed there.

create table public.creature_traits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  takes_value boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.creature_traits enable row level security;

create policy creature_traits_select_all
  on public.creature_traits
  for select
  to authenticated
  using (true);

create table public.skills_talents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('skill', 'talent')),
  description text not null,
  takes_value boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.skills_talents enable row level security;

create policy skills_talents_select_all
  on public.skills_talents
  for select
  to authenticated
  using (true);

create table public.creature_types (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'ludy_reiklandu',
      'zwierzyniec_reiklandu',
      'potworne_bestie_reiklandu',
      'hordy_zielonoskorych',
      'niespokojni_umarli',
      'niewolnicy_ciemnosci'
    )
  ),
  -- Only niewolnicy_ciemnosci has subgroups (Zwierzoludzie, Kultysci, Demony,
  -- Skaveny); every other category leaves this null.
  subcategory text,
  name text not null unique,
  -- Shape: {sz, ww, us, s, wt, i, zw, zr, int, sw, ogd, zyw}, all integers.
  default_attributes jsonb not null,
  -- Array of {trait_id, value}, resolved against creature_traits.id at seed time.
  default_traits jsonb not null default '[]',
  -- Same shape as default_traits; informational only, never auto-applied.
  suggested_traits jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- The category+search UI (FR-012/FR-013) filters by category first.
create index creature_types_category_idx on public.creature_types (category);

alter table public.creature_types enable row level security;

create policy creature_types_select_all
  on public.creature_types
  for select
  to authenticated
  using (true);

alter table public.npcs
  add column wfrp_creature_type_id uuid references public.creature_types (id) on delete set null,
  add column wfrp_attributes jsonb,
  add column wfrp_traits jsonb not null default '[]',
  add column wfrp_skills_talents jsonb not null default '[]',
  add column wfrp_zyw_overridden boolean not null default false;
