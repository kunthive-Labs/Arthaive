-- Performance indexes for deals table

-- Full-text search on company name
create index if not exists deals_company_trgm_idx on deals using gin (company gin_trgm_ops);

-- Date-based queries
create index if not exists deals_date_idx on deals (deal_date desc);

-- Stage filter
create index if not exists deals_stage_idx on deals (stage);

-- Location filter
create index if not exists deals_location_idx on deals (location);

-- Amount range queries
create index if not exists deals_amount_idx on deals (amount_inr desc);

-- Sector array search (GIN index for @> operator)
create index if not exists deals_sectors_gin_idx on deals using gin (sectors);

-- Investor array search
create index if not exists deals_investors_gin_idx on deals using gin (investors);

-- Week folder for data organization
create index if not exists deals_week_folder_idx on deals (week_folder);

-- Submissions status
create index if not exists submissions_status_idx on submissions (status, submitted_at desc);

-- Investors slug lookup
create index if not exists investors_slug_idx on investors (slug);
create index if not exists investors_name_trgm_idx on investors using gin (name gin_trgm_ops);

-- Composite: date + amount for analytics
create index if not exists deals_date_amount_idx on deals (deal_date desc, amount_inr desc);

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at_column();
