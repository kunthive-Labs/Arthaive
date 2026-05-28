-- Phase 7 — AI Layer
-- Three tables: cached report summaries, sector classification cache, and usage log.

-- 1. report_summaries — cached AI-written trend digests, keyed by period id.
create table if not exists report_summaries (
  period_id text primary key,
  period_type text not null check (period_type in ('week', 'month')),
  summary text not null,
  input_tokens int default 0,
  output_tokens int default 0,
  model text,
  generated_at timestamptz not null default now()
);

create index if not exists idx_report_summaries_generated_at
  on report_summaries(generated_at desc);

-- 2. sector_cache — company → sector mapping, fed by Claude classification fallback.
create table if not exists sector_cache (
  company text primary key,
  sector text not null,
  confidence numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  model text,
  created_at timestamptz not null default now()
);

-- 3. ai_usage_log — every Claude API call, for cost monitoring.
create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  use_case text not null,        -- 'trend_summary' | 'nl_search' | 'sector_classify'
  model text,
  input_tokens int default 0,
  output_tokens int default 0,
  cached boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_log_created_at
  on ai_usage_log(created_at desc);
create index if not exists idx_ai_usage_log_use_case
  on ai_usage_log(use_case);

-- RLS — only service role and admins can read AI tables.
alter table report_summaries enable row level security;
alter table sector_cache enable row level security;
alter table ai_usage_log enable row level security;

-- Anyone can read cached report summaries (they're public content shown on /reports).
create policy "report_summaries readable by anon"
  on report_summaries for select
  using (true);

-- Only authenticated users (admin pages are gated separately) can read usage data.
create policy "ai_usage_log readable by authenticated"
  on ai_usage_log for select
  to authenticated
  using (true);

create policy "sector_cache readable by authenticated"
  on sector_cache for select
  to authenticated
  using (true);

-- Inserts/updates flow through the service-role key from server routes.
