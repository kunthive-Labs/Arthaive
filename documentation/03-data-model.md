# 03 — Data model

Every table is defined in `supabase/migrations/`. This page explains each one — what it holds, why it exists, and how it connects to the others.

## The big picture

```
   sources ─┐                        ┌── investors
            │                        │
            │     review_queue       │
            │           │            │
            │           ▼            │
            └──────► deals ◄─────────┘
                       │
                       ├── sectors
                       │
            ┌── startup_aliases
            │
            └── investor_aliases

   pipeline_jobs   (audit log, not joined)
   submissions     (community submissions, separate workflow)
   user_profiles,  alerts, notification_preferences (user features)
```

## Core tables

### `deals` — the verified dataset

The single source of truth for every funding event we have confirmed. Public read access via RLS. Schema lives in `001_initial_schema.sql` extended by `014_deals_columns.sql`.

| Column | Type | Purpose |
|---|---|---|
| `id` | text PK | Slug-style id, e.g. `"razorpay-20260315-a1b2c3"`. Pipeline-inserted rows use `{company-slug}-{YYYYMMDD}-{hash6}`; legacy rows use `W{week} Q{q} FY{yy}-{n}` |
| `company` | text | Canonical company name (after entity resolution) |
| `company_url` | text | Optional homepage |
| `amount_inr`, `amount_usd` | numeric | Both currencies stored, normalized at ingest time |
| `stage` | text | "Seed", "Series A", "Series B", "Pre-Series A", "Bridge", "Debt", "Acquisition" |
| `sectors` | text[] | Array of sector tags ("fintech", "lending") |
| `investors` | text[] | Array of canonical investor names |
| `lead_investor` | text | Canonical name of the lead, if known |
| `deal_date` | date | When the round was announced |
| `location` | text | City in India |
| `description` | text | One-line free-text summary |
| `source_url` | text | The article we extracted from |
| `source_id` | uuid FK→sources | Foreign key to the canonical source record |
| `record_status` | text | `verified` (public), `needs_review`, `rejected`, `merged` |
| `date_confidence` | text | `exact`, `month_only`, `quarter_only`, `estimated` |
| `stage_confidence` | text | `confirmed`, `inferred`, `uncertain` |
| `week_folder` | text | Legacy; the weekly-CSV folder the deal came from (pre-pipeline) |
| `created_at`, `updated_at` | timestamptz | Audit fields |

**Public reads filter on `record_status = 'verified'`.** Charts and listings never show review-pending or rejected rows.

### `sources` — every article we have touched

One row per URL the pipeline (or a human) processed. Created in `010_sources_table.sql`.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | |
| `source_type` | text | `news_article`, `press_release`, `weekly_roundup`, `regulatory_filing`, `social_post`, `manual_entry` |
| `title`, `url` | text | URL is UNIQUE — this is the URL-level dedup key |
| `publication_date` | date | When the article was published |
| `publisher` | text | "Entrackr", "Inc42", "YourStory", etc. |
| `reliability_tier` | text | `tier_1` (Entrackr, Inc42), `tier_2` (general business press), `tier_3` (rumours, social) |
| `extraction_method` | text | `manual`, `rss_auto`, `scraper`, `ai_extracted` |
| `raw_text_snapshot` | text | First 5000 chars of body, kept for audit even if the article goes dead |

Why we store the raw snapshot: if the source article is deleted later, we still have the evidence we extracted from.

### `review_queue` — pipeline output awaiting human approval

Records the pipeline extracted but did not auto-approve. Defined in `012_review_queue.sql`.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid FK→sources | The article it came from |
| `raw_extracted_data` | jsonb | The full extractor output, including currency, sectors, investors, confidence |
| `suggested_company` | text | What the entity resolver matched (or the raw name if no match) |
| `match_confidence` | float (0-1) | Entity resolution confidence: ≥0.92 auto, 0.75-0.91 needs confirmation |
| `status` | text | `pending`, `approved`, `rejected`, `merged`, `needs_more_info` |
| `reviewed_by`, `reviewed_at` | text, timestamptz | Audit trail |
| `notes` | text | Reviewer notes, or pipeline-attached hints like "Possible duplicate of {id}" |

Lifecycle: pipeline inserts as `pending` → admin reviews → either inserts into `deals` and marks `approved`, or marks `rejected` / `merged` / `needs_more_info`.

## Entity tables

### `investors` — canonical investor records

```sql
id uuid, name text, slug text unique, type text, website text, created_at
```

Type is one of VC, Angel, Corporate, Family Office, Government, Other.

### `sectors` — sector taxonomy

```sql
id uuid, name text unique, slug text unique, created_at
```

Seeded with the predefined taxonomy in `PROJECT_REFERENCE.md §6.8`: Fintech, SaaS, Consumer Internet, Healthtech, Edtech, etc.

### `startup_aliases` — name variants for companies

Defined in `011_startup_aliases.sql`.

| Column | Type | Purpose |
|---|---|---|
| `company` | text | Canonical name (matches `deals.company`) |
| `alias_name` | text UNIQUE | The variant we saw in the wild |
| `alias_type` | text | `former_name` (e.g. "Fashnear Technologies" → "Meesho"), `alternate_spelling`, `short_name`, `brand_name` |

Has a trigram GIN index for fast fuzzy lookups.

### `investor_aliases` — name variants for investors

Same shape as `startup_aliases`. Example: `('Peak XV Partners', 'Sequoia Capital India')` — when the pipeline sees "Sequoia Capital India" in an article, the entity resolver rewrites it to "Peak XV Partners".

## Operational tables

### `pipeline_jobs` — one row per pipeline run

Defined in `013_pipeline_jobs.sql`. Pure audit log; not joined to anything.

| Column | Purpose |
|---|---|
| `run_at`, `created_at` | When |
| `source_feed` | e.g. `entrackr_sitemap` |
| `articles_fetched`, `articles_filtered`, `records_extracted`, `records_auto_approved`, `records_flagged` | Counts |
| `run_status` | `success`, `partial`, `failed` |
| `error_log` | Stack trace if anything went wrong |

Used by the admin "Pipeline" page to monitor health.

### `submissions` — community-submitted deals

Defined in `001_initial_schema.sql`. Same shape as a deal plus `submitted_by` and `reviewer_notes`. Lives in a separate table from `review_queue` because the workflow is slightly different — community submissions have no source article we crawled, they have a URL the submitter provided.

## User-facing tables (built in earlier work)

| Table | Purpose | Migration |
|---|---|---|
| `user_profiles` | Display name, avatar, bio, settings | `006_user_profiles.sql` |
| `bookmarks`, `saved_searches`, `watchlists` | Per-user features | `007_user_features.sql` |
| `alerts` | User-defined funding alerts | `008_alerts.sql` |
| `notification_preferences` | Email digest opt-ins | `009_notification_preferences.sql` |

## Why the schema is shaped this way

- **`deals.company` is text, not a foreign key to a `startups` table.** This is a pragmatic shortcut. The original spec in `PROJECT_REFERENCE.md §6` calls for a separate `startups` table; we collapsed it because the alias table already gives us canonical identity (P2). If we add per-startup fields later (founders, founded_date, employee_count), we will split it out.
- **`investors` is a soft table.** `deals.investors` is a text array, not a join table. Same trade-off: we get canonical names via `investor_aliases`, and analytics queries that need investor → deals joins use array-contains operators.
- **`record_status` lives on `deals`, not in a separate workflow table.** A deal can be unverified, verified, or rejected without leaving the table. This keeps reads simple — public queries filter `where record_status='verified'`.

These are deliberate trade-offs, not oversights. If they start hurting (e.g. investor profile pages get slow), normalization is reversible.
