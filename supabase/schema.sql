-- Run this once in the Supabase SQL editor for the KAED project.
--
-- Naming: "projects" are things you've committed to executing. The
-- actionable steps inside a project are open_points linked to it -- the
-- separate "challenges" table that used to hold them was folded into the
-- Open Point List, so there is one work-item table rather than two.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'not_started' check (status in ('not_started', 'active', 'done')),
  start_date date,
  target_end_date date,
  tagline text,
  website_url text,
  location text,
  team_size integer,
  industry text,
  founded_year integer,
  funding_stage text check (funding_stage is null or funding_stage in (
    'idea', 'building', 'bootstrapped', 'funded', 'profitable', 'paused'
  )),
  -- Monthly recurring revenue. Only 'active' projects are summed on the
  -- freedom dashboard; counting a done/not_started project would quietly
  -- inflate the one number the whole app exists to move.
  mrr numeric(12,2) not null default 0,
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

-- Personal goal register: a simple, ordered list of goals the user is
-- working toward. Drag-and-drop reorderable via rank, like business_ideas.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Open Point List: the single work-item table. A PMP-style tracker -- what
-- needs doing, who is on it, where it stands -- optionally linked to exactly
-- one parent (a goal or a project, never both).
create table if not exists public.open_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  -- Freeform, not an FK: contributors are often people with no account here.
  contributors text,
  -- SET NULL, not CASCADE: deleting a project must not silently delete the
  -- open points written about it -- they fall back to the unparented list.
  goal_id uuid references public.goals(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Null = active, shows on /opl. Set = hidden from the main list but kept
  -- (notes and status history included) and visible on /opl/archive.
  -- Separate from `status`: an item can be archived at any status, not just
  -- closed -- an abandoned "open" item shouldn't have to be marked done
  -- first just to get it out of the way.
  archived_at timestamptz,
  constraint open_points_single_parent check (goal_id is null or project_id is null)
);

create index if not exists open_points_goal_id_idx on public.open_points (goal_id);
create index if not exists open_points_project_id_idx on public.open_points (project_id);
create index if not exists open_points_archived_at_idx on public.open_points (archived_at);

alter table public.open_points enable row level security;

create policy "own open points" on public.open_points
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
  category text check (category is null or category in (
    'work-mine', 'work-others',
    'life-mine', 'life-known', 'life-strangers',
    'tech-app',
    'clone-niche', 'clone-geo', 'clone-pricing', 'clone-usecase', 'clone-oss'
  )),
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hidden from /business-ideas (shown on /business-ideas/archive) without deleting; null = active.
alter table public.business_ideas add column if not exists archived_at timestamptz;

alter table public.business_ideas enable row level security;

create policy "own business ideas" on public.business_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public, safe-columns view of actively-ongoing projects, shown as cards on
-- the public homepage. Runs with the view owner's privileges (not the
-- querying anon role), so it bypasses the projects table's owner-only RLS
-- policy by design -- only add columns here that are fine to be public.
create or replace view public.public_active_projects as
select id, title, tagline, description, website_url, industry, founded_year, funding_stage, created_at
from public.projects
where status = 'active'
order by created_at desc;

grant select on public.public_active_projects to anon, authenticated;

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
  -- MRR at which the 9-5 gets handed back. Drives /freedom.
  mrr_target numeric(12, 2),
  updated_at timestamptz not null default now()
);

alter table public.finance_limits enable row level security;

create policy "household finance limits" on public.finance_limits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Specific knowledge: personal self-knowledge cards (what you're obsessed
-- with, unusually good at, or have lived through). Personal-to-one-account,
-- so RLS is scoped to auth.uid() unlike the shared finance tables.
create table if not exists public.knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  evidence text,
  kind text check (kind is null or kind in ('obsession', 'skill', 'experience', 'strength')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_cards enable row level security;

create policy "own knowledge cards" on public.knowledge_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- System design: use cases, actors, system goals, and requirements for a
-- project, organized the standard requirements-engineering way (actors
-- perform use cases; use cases satisfy goals; requirements trace back to a
-- use case). Each row belongs to one project.
create table if not exists public.system_actors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  kind text not null default 'primary' check (kind in ('primary', 'secondary', 'system')),
  created_at timestamptz not null default now()
);

create table if not exists public.system_goals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_use_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references public.system_actors(id) on delete set null,
  title text not null,
  description text,
  preconditions text,
  main_flow text,
  postconditions text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  use_case_id uuid references public.system_use_cases(id) on delete set null,
  title text not null,
  description text,
  kind text not null default 'functional' check (kind in ('functional', 'non_functional')),
  priority text not null default 'must' check (priority in ('must', 'should', 'could', 'wont')),
  created_at timestamptz not null default now()
);

create index if not exists system_actors_project_id_idx on public.system_actors (project_id);
create index if not exists system_goals_project_id_idx on public.system_goals (project_id);
create index if not exists system_use_cases_project_id_idx on public.system_use_cases (project_id);
create index if not exists system_use_cases_actor_id_idx on public.system_use_cases (actor_id);
create index if not exists system_requirements_project_id_idx on public.system_requirements (project_id);
create index if not exists system_requirements_use_case_id_idx on public.system_requirements (use_case_id);

alter table public.system_actors enable row level security;
alter table public.system_goals enable row level security;
alter table public.system_use_cases enable row level security;
alter table public.system_requirements enable row level security;

create policy "own system actors" on public.system_actors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own system goals" on public.system_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own system use cases" on public.system_use_cases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own system requirements" on public.system_requirements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crypto holdings, owner-only (the shared `member` role never sees these).
-- Prices come from CoinMarketCap at request time and are not stored; only the
-- position itself lives here.
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- cmc_slug wins over symbol when set, for tickers that collide across
  -- chains (SIGMA resolves to several coins; sigma-sol is the one held).
  symbol text not null,
  cmc_slug text,
  quantity numeric(28, 10) not null default 0,
  cost_basis_huf numeric(16, 2) not null default 0,
  goal_price_usd numeric(28, 10),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investments enable row level security;

create policy "own investments" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comment/update log on an open point. List view shows only the latest;
-- the detail page shows the full thread -- the same shape as client_notes.
create table if not exists public.open_point_notes (
  id uuid primary key default gen_random_uuid(),
  open_point_id uuid not null references public.open_points(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists open_point_notes_open_point_id_idx on public.open_point_notes (open_point_id);

alter table public.open_point_notes enable row level security;

create policy "own open point notes" on public.open_point_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per status transition, so "how long has this actually been stuck
-- in progress" is answerable instead of a guess. Written whenever
-- open_points.status changes (see the field route's onWrite hook) and once
-- at creation for the starting status.
create table if not exists public.open_point_status_events (
  id uuid primary key default gen_random_uuid(),
  open_point_id uuid not null references public.open_points(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('open', 'in_progress', 'closed')),
  changed_at timestamptz not null default now()
);

create index if not exists open_point_status_events_open_point_id_idx on public.open_point_status_events (open_point_id);

alter table public.open_point_status_events enable row level security;

create policy "own open point status events" on public.open_point_status_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Idea Lab: the 11-step "find a startup idea" process as a working tool.
--
-- ONE permanent worksheet per user, not one per idea. The framework is a
-- generative process -- you run it to *find* ideas -- so making the user name
-- an idea before they could open the steps had it exactly backwards: it
-- turned a search into a filing cabinet. Steps 1-5 are the ongoing raw
-- material (background, pain, demand evidence, money, secrets), candidate
-- ideas emerge out of that at Step 6, and Steps 7-11 sharpen them.
create table if not exists public.idea_lab (
  id uuid primary key default gen_random_uuid(),
  -- Unique: the singleton invariant lives in the DB, not just in the helper
  -- that upserts it, so a double-submit can't quietly create a second
  -- worksheet the UI would then pick between at random.
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- Step 1: unfair advantages, unusual expertise, industries known inside.
  background text,
  -- Step 2: personal pain audit.
  personal_pain text,
  -- Step 3 is the idea_lab_evidence log below, not a column.
  -- Step 4: confirmation money is already moving in the space.
  money_evidence text,
  -- Step 5: the secret -- what valuable thing nobody's building yet.
  secret text,
  -- Step 6 is the idea_candidates log below, not a column.
  -- Step 7: the one specific, nameable buyer.
  buyer text,
  -- Step 8: answers to the three stress-test questions.
  stress_test text,
  -- Step 9: checked against the four idea traps (CISP, tar pit, schlep, unsexy).
  trap_check text,
  -- Step 10: notes against the 10-question score.
  score_notes text,
  -- Step 11: the pitch, headline, and what validation actually turned up.
  validation text,
  -- Where the guided walkthrough left off. Persisted rather than kept in the
  -- URL because nobody finishes eleven steps in one sitting -- coming back
  -- tomorrow should resume the process, not restart it.
  current_step smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.idea_lab enable row level security;

create policy "own idea lab" on public.idea_lab
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Step 3: market-demand evidence log. A repeating list, not one field --
-- the framework explicitly asks you to log every finding (problem, source,
-- permalink, engagement, date, quote), not summarize them into a paragraph.
-- Hangs off the worksheet, since the search runs before any idea has a name.
create table if not exists public.idea_lab_evidence (
  id uuid primary key default gen_random_uuid(),
  idea_lab_id uuid not null references public.idea_lab(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  problem text not null,
  source text,
  permalink text,
  engagement text,
  quote text,
  found_on date,
  created_at timestamptz not null default now()
);

create index if not exists idea_lab_evidence_idea_lab_id_idx on public.idea_lab_evidence (idea_lab_id);

alter table public.idea_lab_evidence enable row level security;

create policy "own idea lab evidence" on public.idea_lab_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Step 6: the ideas that emerge from Steps 1-5. Deliberately thin -- a name,
-- a note, and a verdict. The step prose that used to live on these rows moved
-- to the single worksheet above; a candidate is an *output* of the process,
-- not the container for it. Converting to a business idea (business_idea_id
-- set) doesn't delete the candidate -- it stays as the paper trail.
create table if not exists public.idea_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_lab_id uuid not null references public.idea_lab(id) on delete cascade,
  title text not null,
  note text,
  decision text not null default 'testing' check (decision in ('testing', 'go', 'no_go')),
  rank integer not null default 0,
  business_idea_id uuid references public.business_ideas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_candidates_idea_lab_id_idx on public.idea_candidates (idea_lab_id);
create index if not exists idea_candidates_business_idea_id_idx on public.idea_candidates (business_idea_id);

alter table public.idea_candidates enable row level security;

create policy "own idea candidates" on public.idea_candidates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Study collection: paste a URL, Claude extracts startup-relevant takeaways
-- from it. Manual entry for now; source_type anticipates the long-term goal
-- (auto-scraping YouTube/X/websites) without building that yet.
create table if not exists public.studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  source_type text not null default 'blog' check (source_type in ('blog', 'youtube', 'x', 'website')),
  status text not null default 'pending' check (status in ('pending', 'summarized', 'failed')),
  error text,
  fetched_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists studies_status_idx on public.studies (status);

alter table public.studies enable row level security;

create policy "own studies" on public.studies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per extracted takeaway, categorized so they're filterable later
-- ("show me every sales takeaway across all studies") rather than locked
-- inside one freeform summary blob per study.
create table if not exists public.study_takeaways (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('delivery', 'marketing', 'sales', 'market_research', 'other')),
  takeaway text not null,
  created_at timestamptz not null default now()
);

create index if not exists study_takeaways_study_id_idx on public.study_takeaways (study_id);
create index if not exists study_takeaways_category_idx on public.study_takeaways (category);

alter table public.study_takeaways enable row level security;

create policy "own study takeaways" on public.study_takeaways
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Freeform discussion thread on a study, same shape as client_notes /
-- open_point_notes.
create table if not exists public.study_comments (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists study_comments_study_id_idx on public.study_comments (study_id);

alter table public.study_comments enable row level security;

create policy "own study comments" on public.study_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Think Pad: a real wiki, not a blog. think_pad_pages is one row per page;
-- think_pad_entries is one row per *line* of a page's Notion-style document
-- (page_id + float `position` for midpoint insertion -- pressing Enter
-- mid-document splits at the cursor and inserts a line between two existing
-- positions without renumbering anything else). [[Page Title]] links are
-- resolved by title at render time, not stored resolved; search_text/tsv
-- cover a page's title + every line's body + every attached table cell (see
-- recomputeSearchText in lib/think-pad-helpers.ts). Lines written from the
-- app, or appended by Claude via the remote MCP endpoint's `save_thought`
-- tool, which finds-or-creates a page titled "Inbox" and appends there --
-- that tool resolves the owner's user_id server-side, so nothing about auth
-- needs to reach the chat. `source` on a line just marks which came from chat.
create table if not exists public.think_pad_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  search_text text not null default '',
  search_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists think_pad_pages_search_idx on public.think_pad_pages using gin (search_tsv);

alter table public.think_pad_pages enable row level security;

create policy "own think pad pages" on public.think_pad_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.think_pad_pages_tsv_trigger() returns trigger as $$
begin
  new.search_tsv := to_tsvector('english', coalesce(new.title, '') || ' ' || coalesce(new.search_text, ''));
  return new;
end
$$ language plpgsql;

create trigger think_pad_pages_tsv_update
  before insert or update on public.think_pad_pages
  for each row execute function public.think_pad_pages_tsv_trigger();

-- `title` here is dormant: an earlier "blog of separate posts" version of
-- this table had one, no app code reads or writes it any more, and it was
-- never dropped because the table was already live and DROP COLUMN needs a
-- human to run it (ask before doing that, same as any other DDL here).
-- `page_id` is nullable for the same "already live" reason -- it was added
-- with ALTER TABLE after this table already had rows, and every write path
-- sets it in practice; see CLAUDE.md's Think Pad section for why it was
-- deliberately never tightened to NOT NULL.
create table if not exists public.think_pad_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid references public.think_pad_pages(id) on delete cascade,
  title text,
  body text not null,
  position double precision not null default 0,
  source text not null default 'app' check (source in ('app', 'mcp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists think_pad_entries_page_position_idx on public.think_pad_entries (page_id, position);

alter table public.think_pad_entries enable row level security;

create policy "own think pad entries" on public.think_pad_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- think_pad_tables / think_pad_table_rows (an attached-database feature, one
-- table per page) existed here briefly and were dropped -- turned out
-- unwanted (both DROP TABLEs succeeded against production, verified via
-- information_schema.tables; unlike DROP COLUMN elsewhere in this file,
-- this one wasn't blocked by the environment's safety classifier).

-- Idea Lab playbook: the reference text ("How to Find Pain Points and
-- Successful Business Opportunities") kept as one editable page -- one row per
-- top-level section (position order), title + raw-markdown body, each shown as
-- a text input on /idea-lab. Not split into sub-pages on purpose.
create table if not exists public.idea_lab_playbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null default 0,
  title text not null default '',
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_lab_playbook_user_position_idx on public.idea_lab_playbook (user_id, position);

alter table public.idea_lab_playbook enable row level security;

create policy "own idea lab playbook" on public.idea_lab_playbook
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Idea Lab thinking space: the free-form text box on /idea-lab. The 11-step
-- columns above are retired (nothing reads or writes them; their text was
-- folded into `thinking`), as are idea_lab_evidence and idea_candidates.
alter table public.idea_lab add column if not exists thinking text;

-- Per-section personal notes shown under each playbook section (empty by default).
alter table public.idea_lab_playbook add column if not exists notes text;

-- Blog CMS (/cms): sites, the ideas queue that feeds the generator, and posts.
-- Public read API: /api/cms/v1/* (per-site bearer key, sha256 stored). Media: public storage bucket 'cms-media'.
create table if not exists public.cms_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  domain text,
  language text not null default 'hu',
  brand_context text,
  deploy_hook_url text,
  api_key_hash text,
  api_key_prefix text,
  active boolean not null default true,
  auto_publish boolean not null default false,
  schedule_days smallint[] not null default '{1,3}',
  publish_hour smallint not null default 9 check (publish_hour between 0 and 23),
  timezone text not null default 'Europe/Budapest',
  buffer smallint not null default 2 check (buffer between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists cms_sites_api_key_hash_idx on public.cms_sites (api_key_hash);

create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cms_sites(id) on delete cascade,
  idea_id uuid,
  slug text not null,
  title text not null,
  description text,
  excerpt text,
  body_md text not null default '',
  cover_image_url text,
  cover_alt text,
  keywords text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  publish_at timestamptz,
  published_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create index if not exists cms_posts_site_status_idx on public.cms_posts (site_id, status, publish_at);

create table if not exists public.cms_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cms_sites(id) on delete cascade,
  idea text not null,
  status text not null default 'queued' check (status in ('queued', 'generating', 'used', 'failed')),
  post_id uuid references public.cms_posts(id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists cms_ideas_site_status_idx on public.cms_ideas (site_id, status, created_at);

alter table public.cms_sites enable row level security;
alter table public.cms_posts enable row level security;
alter table public.cms_ideas enable row level security;
create policy "own cms sites" on public.cms_sites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cms posts" on public.cms_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cms ideas" on public.cms_ideas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Bank sync (Enable Banking). Owner-only and server-only: RLS is on with NO
-- policies, so the anon/authenticated roles can read nothing; every access
-- goes through the service-role client after an owner check (lib/banking.ts).
-- Deliberately not shared with the household `member` role like finance_*.
-- ─────────────────────────────────────────────────────────────────────────

-- One row per bank link. The row is created 'pending' when consent starts and
-- its id is the OAuth `state`, so the callback finds it. Reconnecting an
-- expired bank reuses the same row, which keeps imported history attached.
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  country text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'error')),
  session_id text,
  -- [{ uid, identification_hash, iban, name, currency }]. `uid` is only valid
  -- inside this session; identification_hash is the stable account identity.
  accounts jsonb not null default '[]'::jsonb,
  valid_until timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  account_hash text not null,
  account_label text,
  -- entry_reference / transaction_id from the bank, or a hash of the row's
  -- fields when the bank sends neither. Unique per account => re-syncing and
  -- reconnecting can never duplicate a transaction.
  dedupe_key text not null,
  booked_on date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  direction text not null check (direction in ('in', 'out')),
  currency text not null,
  counterparty text,
  -- Normalised counterparty used to match bank_rules.
  counterparty_key text,
  remittance text,
  status text not null default 'inbox' check (status in ('inbox', 'imported', 'ignored')),
  finance_transaction_id uuid references public.finance_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (account_hash, dedupe_key)
);

create index if not exists bank_transactions_status_idx on public.bank_transactions (status, booked_on desc);

-- "Tesco -> Groceries" so the next one from that counterparty files itself.
create table if not exists public.bank_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_key text not null unique,
  category_id uuid references public.finance_categories(id) on delete cascade,
  ignore boolean not null default false,
  created_at timestamptz not null default now(),
  check (ignore or category_id is not null)
);

alter table public.bank_connections enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_rules enable row level security;
