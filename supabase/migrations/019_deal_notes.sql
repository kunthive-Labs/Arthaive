-- Per-user private notes + tags on individual deals.
-- One note row per (user, deal); upserted on conflict. Tags are free-form
-- labels the user attaches to organise their own research across deals.
create table if not exists public.deal_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deal_id text not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, deal_id)
);

alter table public.deal_notes enable row level security;

-- Notes are strictly private: a user can only ever see or touch their own.
create policy "Users manage own deal notes" on public.deal_notes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists deal_notes_user_idx on public.deal_notes(user_id);
create index if not exists deal_notes_deal_idx on public.deal_notes(deal_id);
