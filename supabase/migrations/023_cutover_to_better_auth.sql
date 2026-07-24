-- Preserve existing Supabase Auth UUIDs so bookmarks, dashboards, notes, and
-- other user-owned records do not need to be rewritten.
insert into better_auth."user" (
  id,
  name,
  email,
  "emailVerified",
  image,
  "createdAt",
  "updatedAt"
)
select
  users.id,
  coalesce(profiles.full_name, users.raw_user_meta_data->>'full_name', split_part(users.email, '@', 1)),
  users.email,
  users.email_confirmed_at is not null,
  coalesce(profiles.avatar_url, users.raw_user_meta_data->>'avatar_url'),
  users.created_at,
  coalesce(profiles.updated_at, users.updated_at, users.created_at)
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where users.email is not null
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  "emailVerified" = excluded."emailVerified",
  image = coalesce(excluded.image, better_auth."user".image),
  "updatedAt" = excluded."updatedAt";

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references better_auth."user"(id) on delete cascade;

create or replace function public.handle_new_better_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.name, new.image)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

create trigger on_better_auth_user_created
  after insert or update of email, name, image on better_auth."user"
  for each row execute procedure public.handle_new_better_auth_user();

-- Better Auth cookies are not Supabase JWTs. Private data is accessed only by
-- authenticated server routes using the service role and explicit owner filters.
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users manage own watchlist" on public.watchlist;
drop policy if exists "Users manage own bookmarks" on public.bookmarks;
drop policy if exists "Users manage own saved searches" on public.saved_searches;
drop policy if exists "Users manage own alerts" on public.alerts;
drop policy if exists "Users manage own dashboards" on public.dashboards;
drop policy if exists "Users manage own deal notes" on public.deal_notes;

-- Link newly created API keys to immutable user IDs. Existing keys remain valid
-- and are backfilled when their normalized email has a unique profile match.
alter table public.api_keys
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.api_keys as keys
set user_id = profiles.id
from public.profiles as profiles
where keys.user_id is null
  and lower(keys.email) = lower(profiles.email);

create index if not exists idx_api_keys_user_id on public.api_keys(user_id);
