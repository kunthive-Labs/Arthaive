-- Phase 9 — Performance: indexes on the hot read paths.
-- All of these are read-heavy filters used by /explore, /analytics, /api/v1, and the report aggregations.

create index if not exists idx_deals_date on deals(deal_date desc);
create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_deals_location on deals(location);
create index if not exists idx_deals_sectors on deals using gin(sectors);
create index if not exists idx_deals_investors on deals using gin(investors);
create index if not exists idx_deals_amount on deals(amount_inr desc);

-- Composite for the common (record_status = 'verified', deal_date desc) scan in
-- lib/db/analytics.ts and lib/db/reports.ts.
create index if not exists idx_deals_status_date
  on deals(record_status, deal_date desc);
