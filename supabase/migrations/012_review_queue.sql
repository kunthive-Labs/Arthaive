-- Review queue — holds extracted records awaiting human verification
-- High-confidence records are auto-approved; the rest land here

create table if not exists review_queue (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid references sources (id) on delete set null,
  raw_extracted_data   jsonb not null default '{}',  -- what the pipeline extracted
  suggested_company    text,     -- best entity match found by resolver
  match_confidence     float check (match_confidence >= 0 and match_confidence <= 1),
  status               text not null default 'pending'
                         check (status in (
                           'pending','approved','rejected','merged','needs_more_info'
                         )),
  reviewed_by          text,     -- admin user email who acted on this item
  reviewed_at          timestamptz,
  notes                text,     -- reviewer notes or reason for rejection
  created_at           timestamptz default now()
);

comment on table review_queue is 'Staging area for pipeline-extracted records before they enter the verified deals table';
comment on column review_queue.raw_extracted_data is 'JSON blob of all fields the pipeline extracted, including confidence scores per field';
comment on column review_queue.match_confidence is 'Entity resolution confidence: 0.92+ auto-matched, 0.75-0.91 needs human confirmation';

create index if not exists review_queue_status_idx  on review_queue (status, created_at desc);
create index if not exists review_queue_source_idx  on review_queue (source_id);
create index if not exists review_queue_pending_idx on review_queue (created_at desc)
  where status = 'pending';
