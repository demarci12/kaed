-- Run this once in the Supabase SQL editor for the KAED project.

create table if not exists public.challenges (
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

create table if not exists public.challenge_logs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  proof_type text not null default 'text' check (proof_type in ('text', 'link', 'image')),
  proof_url text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists challenge_logs_challenge_id_idx on public.challenge_logs (challenge_id);

alter table public.challenges enable row level security;
alter table public.challenge_logs enable row level security;

create policy "own challenges" on public.challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own challenge logs" on public.challenge_logs
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

-- Sub-todos: checklist items needed to reach a challenge's goal.
create table if not exists public.challenge_todos (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists challenge_todos_challenge_id_idx on public.challenge_todos (challenge_id);

alter table public.challenge_todos enable row level security;

create policy "own challenge todos" on public.challenge_todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
