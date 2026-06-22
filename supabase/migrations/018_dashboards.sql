-- Custom dashboards: each user composes their own widget canvases over the
-- funding ledger. A user can have many dashboards; all are private to them.
-- layout  = react-grid-layout layout array  [{ i, x, y, w, h }, ...]
-- widgets = [{ i, type, config }] where config carries per-widget filters
create table if not exists public.dashboards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  layout jsonb not null default '[]',
  widgets jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists dashboards_user_id_idx on public.dashboards(user_id);

alter table public.dashboards enable row level security;
create policy "Users manage own dashboards" on public.dashboards
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
