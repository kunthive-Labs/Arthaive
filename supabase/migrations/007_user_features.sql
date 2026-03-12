-- Watchlist: track companies
create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company text not null,
  created_at timestamptz default now() not null,
  unique(user_id, company)
);

alter table public.watchlist enable row level security;
create policy "Users manage own watchlist" on public.watchlist
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookmarks: save deals
create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deal_id text not null,
  created_at timestamptz default now() not null,
  unique(user_id, deal_id)
);

alter table public.bookmarks enable row level security;
create policy "Users manage own bookmarks" on public.bookmarks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Saved searches
create table if not exists public.saved_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz default now() not null
);

alter table public.saved_searches enable row level security;
create policy "Users manage own saved searches" on public.saved_searches
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
