-- Pipeline jobs — one row per automated discovery/extraction run
-- Used for observability and alerting on failures

create table if not exists pipeline_jobs (
  id                    uuid primary key default gen_random_uuid(),
  run_at                timestamptz default now(),
  source_feed           text,           -- e.g. "entrackr_rss", "inc42_rss"
  articles_fetched      int default 0,  -- total articles pulled from feed
  articles_filtered     int default 0,  -- passed keyword filter
  records_extracted     int default 0,  -- sent to extraction layer
  records_auto_approved int default 0,  -- confidence >= 0.80, inserted directly
  records_flagged       int default 0,  -- sent to review queue
  run_status            text not null default 'success'
                          check (run_status in ('success','partial','failed')),
  error_log             text,           -- stack trace or error message if failed
  created_at            timestamptz default now()
);

comment on table pipeline_jobs is 'Audit log of every automated pipeline run — used for monitoring and debugging';

create index if not exists pipeline_jobs_status_idx on pipeline_jobs (run_status, created_at desc);
create index if not exists pipeline_jobs_date_idx   on pipeline_jobs (created_at desc);
