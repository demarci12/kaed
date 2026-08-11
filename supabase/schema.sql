-- Run this once in the Supabase SQL editor for the KAED project.
--
-- Naming: "projects" are things you've committed to executing (formerly
-- called "challenges"). "challenges" are the actionable sub-goals inside a
-- project (formerly "challenge_todos") — the concrete next steps that keep
-- you from stalling once you've started. This file reflects that renamed
-- state; see git history for the migration that got existing databases here.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'not_started' check (status in ('not_started', 'active', 'done')),
  start_date date,
  target_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  proof_type text not null default 'text' check (proof_type in ('text', 'link', 'image')),
  proof_url text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  -- Distinguishes external market validation (talked to a prospect, got
  -- paid, got rejected) from plain self-directed activity logging, so
  -- projects can show "did I make progress" separately from "do I have
  -- proof anyone wants this" — the latter is what actually keeps
  -- motivation alive.
  signal_type text not null default 'progress'
    check (signal_type in ('progress', 'customer_contact', 'interest_expressed', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists project_logs_project_id_idx on public.project_logs (project_id);

alter table public.projects enable row level security;
alter table public.project_logs enable row level security;

create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own project logs" on public.project_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for proof images. Files are stored under `{user_id}/...`.
insert into storage.buckets (id, name, public)
values ('challenge-proofs', 'challenge-proofs', false)
on conflict (id) do nothing;

create policy "own proof uploads" on storage.objects
  for all using (
    bucket_id = 'challenge-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'challenge-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Challenges: the actionable sub-goals needed to reach a project's goal.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists challenges_project_id_idx on public.challenges (project_id);

alter table public.challenges enable row level security;

create policy "own challenges" on public.challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Brainstorming space: a freeform whiteboard of ideas. Cards are positioned
-- freely (position_x/position_y) and can be connected to each other
-- (idea_connections) or promoted into the structured business idea register.
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  position_x integer not null default (floor(random() * 300 + 40))::int,
  position_y integer not null default (floor(random() * 300 + 40))::int,
  -- Idea-generation taxonomy (pain/technology/clone tree): which leaf bucket
  -- this pain point falls into. Drives the colored category pill on
  -- /pain-points; null until the user picks one.
  category text check (category is null or category in (
    'work-mine', 'work-others',
    'life-mine', 'life-known', 'life-strangers',
    'tech-app',
    'clone-niche', 'clone-geo', 'clone-pricing', 'clone-usecase', 'clone-oss'
  )),
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "own ideas" on public.ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.idea_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_idea_id uuid not null references public.ideas(id) on delete cascade,
  to_idea_id uuid not null references public.ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_idea_id <> to_idea_id),
  unique (from_idea_id, to_idea_id)
);

alter table public.idea_connections enable row level security;

create policy "own idea connections" on public.idea_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mini CRM: prospective clients and per-client notes.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  stage text not null default 'lead' check (stage in ('lead', 'contacted', 'negotiating', 'won', 'lost')),
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx on public.client_notes (client_id);

alter table public.clients enable row level security;
alter table public.client_notes enable row level security;

create policy "own clients" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own client notes" on public.client_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Business idea register: structured pitches, distinct from the freeform brainstorm space.
create table if not exists public.business_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  pain_point text,
  target_market text,
  validation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_ideas enable row level security;

create policy "own business ideas" on public.business_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Links a project back to the business idea it's executing on, so the
-- brainstorm → idea → project pipeline is traceable, not just three
-- disconnected lists.
alter table public.projects
  add column if not exists business_idea_id uuid references public.business_ideas(id) on delete set null;

create index if not exists projects_business_idea_id_idx on public.projects (business_idea_id);

-- One project per business idea — enforces at the DB level the 1:1 invariant
-- the UI already assumes ("Start working on this" hides once a link exists).
create unique index if not exists projects_business_idea_id_unique_idx
  on public.projects (business_idea_id)
  where business_idea_id is not null;

-- Links a brainstorm card to the business idea it was promoted into.
alter table public.ideas
  add column if not exists business_idea_id uuid references public.business_ideas(id) on delete set null;

create unique index if not exists ideas_business_idea_id_unique_idx
  on public.ideas (business_idea_id)
  where business_idea_id is not null;

-- Household finance tracker. Shared data: unlike every other table in this
-- file, RLS is NOT scoped to auth.uid() = user_id — any authenticated user
-- (owner or the restricted "member" role, see auth.ts requireOwner) can
-- read/write every row, because this is jointly-managed household money,
-- not personal-to-one-account data.
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'saving')),
  -- Default planned monthly amount; seeds budget planning until a
  -- month-specific finance_budgets row is saved.
  default_amount numeric(12, 2) not null default 0,
  -- Monthly interest rate as a percent (0.5 = 0.5%/month). Only meaningful
  -- for type = 'saving'; drives the compounding forecast on /finance/budget.
  interest_rate numeric(6, 3),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'saving')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists finance_transactions_occurred_on_idx on public.finance_transactions (occurred_on desc);

alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;

create policy "household finance categories" on public.finance_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "household finance transactions" on public.finance_transactions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, month)
);

alter table public.finance_budgets enable row level security;

create policy "household finance budgets" on public.finance_budgets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Single shared row: household-wide daily/weekly spending caps.
create table if not exists public.finance_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_limit numeric(12, 2),
  weekly_limit numeric(12, 2),
  starting_savings_balance numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.finance_limits enable row level security;

create policy "household finance limits" on public.finance_limits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
