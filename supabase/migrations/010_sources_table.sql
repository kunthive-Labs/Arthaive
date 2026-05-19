-- Sources table — tracks every article/press release the pipeline processes

create table if not exists sources (
  id                 uuid primary key default gen_random_uuid(),
  source_type        text not null default 'news_article'
                       check (source_type in (
                         'news_article','press_release','weekly_roundup',
                         'regulatory_filing','social_post','manual_entry'
                       )),
  title              text,
  url                text not null unique,
  publication_date   date,
  publisher          text,
  reliability_tier   text not null default 'tier_2'
                       check (reliability_tier in ('tier_1','tier_2','tier_3')),
  extraction_method  text not null default 'manual'
                       check (extraction_method in (
                         'manual','rss_auto','scraper','ai_extracted'
                       )),
  raw_text_snapshot  text,   -- first 5000 chars of article body, stored for audit
  created_at         timestamptz default now()
);

comment on table sources is 'Every article, press release, or filing the pipeline touches';
comment on column sources.raw_text_snapshot is 'Truncated article text captured at extraction time for audit purposes';

create index if not exists sources_publisher_idx      on sources (publisher);
create index if not exists sources_date_idx           on sources (publication_date desc);
create index if not exists sources_tier_idx           on sources (reliability_tier);
create index if not exists sources_type_idx           on sources (source_type);
