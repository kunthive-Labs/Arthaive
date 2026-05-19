-- Alias tables — enable canonical entity resolution
-- Every new name variant confirmed by a human auto-populates these tables

create table if not exists startup_aliases (
  id           uuid primary key default gen_random_uuid(),
  company      text not null,   -- canonical company name in deals table
  alias_name   text not null unique,
  alias_type   text not null default 'alternate_spelling'
                 check (alias_type in (
                   'former_name','alternate_spelling','short_name','brand_name'
                 )),
  created_at   timestamptz default now()
);

comment on table startup_aliases is 'Maps alternate company name spellings to the canonical company name';

create index if not exists startup_aliases_company_idx on startup_aliases (company);
create index if not exists startup_aliases_alias_idx   on startup_aliases (alias_name);

-- Trigram index for fuzzy matching (requires pg_trgm, already enabled in migration 001)
create index if not exists startup_aliases_trgm_idx on startup_aliases
  using gin (alias_name gin_trgm_ops);


create table if not exists investor_aliases (
  id            uuid primary key default gen_random_uuid(),
  investor_name text not null,  -- canonical investor name
  alias_name    text not null unique,
  created_at    timestamptz default now()
);

comment on table investor_aliases is 'Maps alternate investor name spellings to the canonical investor name';

create index if not exists investor_aliases_name_idx  on investor_aliases (investor_name);
create index if not exists investor_aliases_alias_idx on investor_aliases (alias_name);
create index if not exists investor_aliases_trgm_idx  on investor_aliases
  using gin (alias_name gin_trgm_ops);
