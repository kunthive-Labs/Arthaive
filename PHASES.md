# Implementation Phases — India Startup Funding Intelligence Platform

> **How to use this document:** Each phase is self-contained. When you say "implement Phase N", every task in that phase gets built. Phases must be completed in order — each one depends on the previous.
>
> **Current state:** Phase 0 is complete. Work starts at Phase 1.

---

## Status Legend
- ✅ Already done
- 🔲 Needs to be built
- ⚠️ Exists but needs fixing/wiring

---

## Phase 0 — What's Already Done ✅

> Skip this phase. It documents the existing codebase baseline.

**Frontend pages (all built):**
- ✅ Home page (`app/page.tsx`) — hero stats, recent deals, quick insights
- ✅ Explore / search (`app/explore/page.tsx`) — filters, deal list, pagination
- ✅ Analytics (`app/analytics/page.tsx`) — 9 chart types with tabs
- ✅ Deal detail (`app/deal/[id]/page.tsx`) — deal info, similar deals
- ✅ Investor list + detail (`app/investors/`, `app/investors/[id]/`)
- ✅ Sector list + detail (`app/sectors/`, `app/sectors/[slug]/`)
- ✅ Live feed (`app/live/page.tsx`) — Supabase realtime
- ✅ Dashboard (`app/dashboard/page.tsx`) — bookmarks, watchlist, alerts, saved searches
- ✅ Profile + edit (`app/profile/`, `app/profile/edit/`)
- ✅ Login (`app/login/page.tsx`)
- ✅ Submit deal (`app/submit/page.tsx`)
- ✅ 404, error, loading, offline pages

**Data:**
- ✅ 1,695 deals in `data/funding-data.ts` (flat static file)
- ✅ CSV source files in `funding_data/`

**Backend:**
- ✅ All API routes scaffolded (`app/api/...`)
- ✅ Dual-mode DB layer (`lib/db/`) — uses Supabase if configured, falls back to static data
- ✅ Supabase schema for user features: `profiles`, `bookmarks`, `watchlist`, `saved_searches`, `alerts` (`supabase/migrations/`)
- ✅ Auth flow (Supabase SSR, middleware, session management)
- ✅ Rate limiting on API routes
- ✅ Sentry error tracking wired

**Charts (all built in `components/charts/`):**
- ✅ FundingTrendLine, SectorBarChart, StageFunnel, BubbleChart
- ✅ FundingHeatmap, SankeyDiagram, IndiaMap, YoYComparison, DealVelocity

---

## Phase 1 — Supabase Live Database ✅ (implemented)

> **Goal:** Replace the static `funding-data.ts` fallback with a real live Supabase database. After this phase, all data reads from Supabase, not the static file. The app works identically but is now backed by a real DB.
>
> **Exit criteria:** Deploy to Vercel with Supabase env vars set. Every page loads data from Supabase. Zero reference to `fundingData` static import in any page component.

### 1.1 — Fix Supabase schema gaps

The current schema (`supabase/migrations/001_initial_schema.sql`) has a flat `deals` table. It needs additions from the reference doc.

**File: `supabase/migrations/010_sources_table.sql`** — create `sources` table
```sql
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('news_article','press_release','weekly_roundup','regulatory_filing','social_post','manual_entry')),
  title text,
  url text not null unique,
  publication_date date,
  publisher text,
  reliability_tier text not null default 'tier_2' check (reliability_tier in ('tier_1','tier_2','tier_3')),
  extraction_method text not null default 'manual' check (extraction_method in ('manual','rss_auto','scraper','ai_extracted')),
  raw_text_snapshot text,
  created_at timestamptz default now()
);
```

**File: `supabase/migrations/011_startup_aliases.sql`** — create `startup_aliases` and `investor_aliases` tables
```sql
create table if not exists startup_aliases (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  alias_name text not null unique,
  alias_type text not null default 'alternate_spelling' check (alias_type in ('former_name','alternate_spelling','short_name','brand_name')),
  created_at timestamptz default now()
);

create table if not exists investor_aliases (
  id uuid primary key default gen_random_uuid(),
  investor_name text not null,
  alias_name text not null unique,
  created_at timestamptz default now()
);
```

**File: `supabase/migrations/012_review_queue.sql`** — create `review_queue` table
```sql
create table if not exists review_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  raw_extracted_data jsonb not null default '{}',
  suggested_company text,
  match_confidence float check (match_confidence >= 0 and match_confidence <= 1),
  status text not null default 'pending' check (status in ('pending','approved','rejected','merged','needs_more_info')),
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
```

**File: `supabase/migrations/013_pipeline_jobs.sql`** — create `pipeline_jobs` table
```sql
create table if not exists pipeline_jobs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz default now(),
  source_feed text,
  articles_fetched int default 0,
  articles_filtered int default 0,
  records_extracted int default 0,
  records_auto_approved int default 0,
  records_flagged int default 0,
  run_status text not null default 'success' check (run_status in ('success','partial','failed')),
  error_log text,
  created_at timestamptz default now()
);
```

**Also add to `deals` table (migration):**
```sql
alter table deals add column if not exists source_id uuid references sources(id);
alter table deals add column if not exists record_status text not null default 'verified' check (record_status in ('verified','needs_review','rejected','merged'));
alter table deals add column if not exists date_confidence text default 'exact' check (date_confidence in ('exact','month_only','quarter_only','estimated'));
alter table deals add column if not exists stage_confidence text default 'confirmed' check (stage_confidence in ('confirmed','inferred','uncertain'));
```

### 1.2 — Run the migration script

The script `scripts/migrate-to-supabase.ts` already exists. Run it after setting env vars:
```bash
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/migrate-to-supabase.ts
```
This loads all 1,695 deals from CSVs into the `deals` table.

### 1.3 — Set Vercel environment variables

In Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 1.4 — Fix pages that need `force-dynamic`

**File: `app/dashboard/page.tsx`** — add at top:
```ts
export const dynamic = "force-dynamic"
```

**File: `app/profile/page.tsx`** — add at top:
```ts
export const dynamic = "force-dynamic"
```

**File: `app/profile/edit/page.tsx`** — add at top:
```ts
export const dynamic = "force-dynamic"
```

### 1.5 — Fix middleware deprecation

**File: `middleware.ts`** — rename the exported function:
```ts
export async function middleware(request: NextRequest) { ... }
// stays as middleware — this is correct for Next.js. The "proxy" warning
// is a false positive from a specific Next.js version. If warning persists,
// check next.config.mjs for any proxy config.
```

### 1.6 — Wire `explore` page to use API instead of static import

**File: `app/explore/page.tsx`** — currently imports `fundingData` directly. Change to use the `getDeals()` function from `lib/db/deals.ts` (which already has Supabase support). Make the page a server component.

### 1.7 — Wire `analytics` page to use DB data

**File: `app/analytics/page.tsx`** — currently imports `fundingData` directly. Change to fetch from `lib/db/analytics.ts` functions. The chart components already accept data as props, just need the data source changed.

### 1.8 — Verify everything works

Run `npm run build` locally. Should compile clean. Deploy to Vercel. Check `/api/health` returns `"deals": 1695` (or the actual DB count).

---

## Phase 2 — Admin Interface

> **Goal:** A fully functional admin panel at `/admin` for reviewing queue items, managing entities, viewing pipeline logs, and importing data. Only authenticated admin users can access it.
>
> **Exit criteria:** An admin can log in, see the review queue, approve/reject records, edit startup and investor names, and add aliases — all from the UI.

### 2.1 — Admin auth guard

**File: `lib/supabase/admin.ts`** — helper to check if current user is an admin
```ts
// Check if user's email is in ADMIN_EMAILS env var (comma-separated list)
export async function requireAdmin(request: NextRequest): Promise<boolean>
```

**File: `app/admin/layout.tsx`** — wrap all admin pages with auth check. Redirect to `/login` if not authenticated or not admin.

**File: `middleware.ts`** — add `/admin/*` to protected routes, check admin role.

### 2.2 — Admin home / dashboard

**File: `app/admin/page.tsx`**
- Summary cards: pending review items, total verified deals, last pipeline run status, total sources
- Quick links to each admin section
- Last 5 pipeline run results as a table

### 2.3 — Review queue page

**File: `app/admin/review/page.tsx`**

Paginated list of `review_queue` rows with status = `pending`. Each row shows:
- Source article title (linked to original URL)
- Extracted fields: company name, amount, stage, date, investors, sectors
- Suggested match (if any) with confidence score badge
- Status badge

**File: `app/admin/review/[id]/page.tsx`**

Full review page for a single item:
- Left: Original article text snippet (from `sources.raw_text_snapshot`)
- Right: Editable extracted fields form (company, amount, stage, date, investors, sectors, location, source_url)
- Suggested entity match with link to existing deal if found
- Action buttons: **Approve** (inserts into `deals`), **Reject**, **Merge** (select existing deal to merge into), **Edit & Approve**, **Flag**
- Notes textarea for reviewer comments

**File: `app/api/admin/review/[id]/route.ts`**

POST endpoint handling approve/reject/merge actions. Updates `review_queue.status`, inserts into `deals` on approve.

### 2.4 — Entity manager

**File: `app/admin/entities/page.tsx`**

Two tabs: Startups | Investors

Startups tab:
- Search box filtering by company name
- Table: company name, deal count, aliases, actions
- Inline alias management: show existing aliases, add new alias button

Investors tab:
- Same structure for investors

**File: `app/admin/entities/[type]/[name]/page.tsx`**

Edit page for a single entity:
- Edit canonical name
- Add/remove aliases
- Mark aliases as specific types (former_name, alternate_spelling, etc.)
- View all deals associated with this entity

**File: `app/api/admin/entities/route.ts`** — CRUD for startup_aliases and investor_aliases

### 2.5 — Source manager

**File: `app/admin/sources/page.tsx`**

Table of all entries in the `sources` table:
- Title, URL, publisher, reliability tier, extraction method, date
- Filter by tier and publisher
- Toggle reliability tier inline

Add new source form:
- URL input (manually add a source article)
- Title, publisher, tier fields
- Submit → inserts into `sources` and creates `review_queue` entry with `status = pending`

**File: `app/api/admin/sources/route.ts`** — POST to add source, PATCH to update tier

### 2.6 — Pipeline logs viewer

**File: `app/admin/pipeline/page.tsx`**

Table of `pipeline_jobs` rows, newest first:
- Run date/time, source feed, articles fetched, filtered, extracted, auto-approved, flagged
- Status badge (success / partial / failed)
- Error log expandable section on failed runs

### 2.7 — Bulk CSV import

**File: `app/admin/import/page.tsx`**

Upload form accepting a CSV file. CSV columns match the existing `funding_data` format.

On upload:
- Parse CSV on the server
- For each row, apply entity resolution (check aliases)
- Insert all rows into `review_queue` with `status = pending` and `extraction_method = manual`
- Show import summary: N rows queued for review

**File: `app/api/admin/import/route.ts`** — handles multipart CSV upload and queues records

### 2.8 — Data export

**File: `app/admin/export/page.tsx`**

Two buttons:
- Export all verified deals as CSV
- Export all verified deals as JSON

Uses the existing `lib/export.ts` functions, but wired to Supabase data.

---

## Phase 3 — Discovery Pipeline

> **Goal:** An automated Python pipeline that polls RSS feeds twice daily, filters articles for funding keywords, fetches and stores article text, and queues them for review. Runs as a scheduled job.
>
> **Exit criteria:** Running `python pipeline/run.py` fetches new articles from Entrackr and Inc42, stores them in `sources`, and creates `review_queue` entries — without any manual browsing.

### 3.1 — Pipeline directory structure

Create `pipeline/` directory at project root:
```
pipeline/
  __init__.py
  config.py          # env vars, feed URLs, keyword list
  discovery.py       # RSS polling + keyword filter
  fetcher.py         # download + clean article HTML
  queue.py           # insert into sources + review_queue tables
  run.py             # main entry point, runs one full cycle
  requirements.txt   # feedparser, httpx, beautifulsoup4, supabase-py
```

### 3.2 — `pipeline/config.py`

```python
RSS_FEEDS = [
    {"url": "https://entrackr.com/category/report/feed", "publisher": "Entrackr", "tier": "tier_2"},
    {"url": "https://inc42.com/feed", "publisher": "Inc42", "tier": "tier_2"},
    {"url": "https://yourstory.com/feed", "publisher": "YourStory", "tier": "tier_2"},
]

KEYWORDS = [
    "raises", "raised", "funding", "funded", "secured", "closed round",
    "series a", "series b", "series c", "series d", "series e", "series f",
    "seed round", "pre-seed", "bridge round", "debt round",
    "backed by", "led by", "co-led by",
    "crore", "million", "billion",
]
```

### 3.3 — `pipeline/discovery.py`

- `poll_feeds()` — iterate over RSS_FEEDS, parse with `feedparser`, return list of `{title, url, published_date, publisher, tier}`
- `keyword_filter(articles)` — keep only articles where title or description contains any keyword (case-insensitive)
- `already_seen(url, supabase_client)` — check if URL exists in `sources` table
- Returns list of new articles that passed filter and aren't already in DB

### 3.4 — `pipeline/fetcher.py`

- `fetch_article(url)` — download HTML with `httpx`, 10s timeout, retry once
- `extract_text(html)` — use `BeautifulSoup` to strip nav/header/footer/ads, return main article text
- `truncate_snapshot(text, max_chars=5000)` — keep first 5000 chars for storage
- Returns `{title, text_snapshot, publication_date}`

### 3.5 — `pipeline/queue.py`

- `insert_source(article, supabase_client)` — insert into `sources` table, return `source_id`
- `create_queue_entry(source_id, supabase_client)` — insert into `review_queue` with `status = pending` and empty `raw_extracted_data` (extraction happens in Phase 4)
- `log_pipeline_run(stats, supabase_client)` — insert row into `pipeline_jobs`

### 3.6 — `pipeline/run.py`

Main script:
```python
def main():
    articles = poll_feeds()
    filtered = keyword_filter(articles)
    new = [a for a in filtered if not already_seen(a['url'])]
    
    stats = {"articles_fetched": len(articles), "articles_filtered": len(filtered), ...}
    
    for article in new:
        text_data = fetch_article(article['url'])
        source_id = insert_source({**article, **text_data})
        create_queue_entry(source_id)
    
    log_pipeline_run(stats)
```

### 3.7 — `pipeline/requirements.txt`

```
feedparser==6.0.11
httpx==0.27.0
beautifulsoup4==4.12.3
supabase==2.4.6
python-dotenv==1.0.1
```

### 3.8 — Deployment as scheduled job

**Option A (Vercel Cron):**
Create `app/api/pipeline/trigger/route.ts` — an API route that runs the pipeline logic (ported to TypeScript). Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/pipeline/trigger", "schedule": "0 2,14 * * *" }
  ]
}
```
(2 AM and 2 PM UTC = 7:30 AM and 7:30 PM IST)

**Option B (GitHub Actions — simpler for now):**
Create `.github/workflows/pipeline.yml` — runs `python pipeline/run.py` on a schedule.

---

## Phase 4 — Extraction Pipeline

> **Goal:** For each article in the review queue (with `raw_extracted_data = {}`), extract structured funding fields using rule-based parsing first, Claude AI as fallback. Compute confidence score. Auto-approve high-confidence records.
>
> **Exit criteria:** After running the extractor, review queue items have populated `raw_extracted_data`. Records with confidence >= 0.80 are automatically approved into `deals`. Lower-confidence items remain in queue for human review.

### 4.1 — `pipeline/extractor.py`

Rule-based extraction functions:

- `extract_amount(text)` — regex patterns for:
  - `$X Mn`, `$X million`, `$X M`
  - `Rs X crore`, `INR X crore`, `₹X crore`
  - `Rs X lakh`, `$X billion`
  - Returns `{amount_original, currency_original, amount_inr, amount_usd, confidence}`

- `extract_round_type(text)` — keyword matching against round vocabulary. Returns `{round_type, confidence}`

- `extract_startup_name(text)` — look for capitalized entity near "raises", "raised", "secures". Returns `{company, confidence}`

- `extract_investors(text)` — entities following "led by", "backed by", "participated by", "co-led by". Returns `{investors: [], lead_investor, confidence}`

- `extract_date(article_metadata)` — use publication date from RSS. Returns `{date, date_confidence: "exact"}`

- `extract_location(text)` — named city extraction (Bangalore, Mumbai, Delhi, etc.). Returns `{location, confidence}`

- `extract_sector(text)` — keyword matching against sector taxonomy from reference doc. Returns `{sectors: [], confidence}`

### 4.2 — `pipeline/confidence.py`

```python
WEIGHTS = {
    "source_tier": 0.25,    # tier_1=1.0, tier_2=0.7, tier_3=0.4
    "amount": 0.20,
    "round_type": 0.15,
    "startup_name": 0.20,
    "date": 0.10,
    "investors": 0.10,
}

def compute_confidence(extraction_result, source_tier) -> float:
    # weighted sum of individual field confidences
```

### 4.3 — `pipeline/ai_extractor.py`

Only called when `confidence < 0.70`:

```python
def ai_extract(article_text: str, article_url: str) -> dict:
    # Call Anthropic Claude API with structured extraction prompt
    # System prompt: "Extract startup funding details from this article as JSON..."
    # Returns same structure as rule-based extractor
    # Cache result by URL in sources.raw_text_snapshot to avoid re-processing
```

Claude prompt template (in `pipeline/prompts/extraction.txt`):
```
Extract startup funding information from the following article. Return JSON with these fields:
company, amount_original, currency, round_type, announced_date, lead_investor, 
investors (array), sectors (array), location, confidence_score (0-1).

If a field cannot be determined, set it to null. Do not guess.

Article:
{article_text}
```

### 4.4 — `pipeline/deduplication.py`

```python
def is_duplicate(company: str, amount_usd: float, announced_date: str, supabase) -> dict:
    # Check: same company + same round_type + date within 30 days
    # Check: same company + same amount + date within 60 days
    # Returns: {is_duplicate: bool, existing_deal_id: str | None, confidence: float}
```

### 4.5 — Auto-approval logic

In `pipeline/run.py`, after extraction:
```python
if confidence >= 0.80 and not is_duplicate:
    insert_into_deals(extracted_data)
    update_queue_status(queue_id, "approved", auto=True)
elif is_duplicate:
    update_queue_status(queue_id, "needs_more_info", note="Possible duplicate: {existing_id}")
else:
    # Leave as pending for human review
    update_queue(queue_id, raw_extracted_data=extracted_data)
```

### 4.6 — Currency normalization

**File: `pipeline/currency.py`**

- Hardcoded USD/INR rate with date overrides (start simple)
- Later: call Open Exchange Rates free API for historical rates
- All amounts stored as both `amount_inr` and `amount_usd`

### 4.7 — Wire extraction to run as second pass

Update `pipeline/run.py` to have two modes:
- `--discover` — poll feeds, store articles
- `--extract` — process all unextracted review_queue items
- Default (no args) — run both

---

## Phase 5 — Entity Resolution

> **Goal:** Every company name mention in extracted records maps to a canonical entity. No two deals refer to the same company by different names. Investor names are normalized similarly.
>
> **Exit criteria:** Searching for "BharatPe" returns all deals regardless of whether they were stored as "Bharat Pe", "BharatPe", or "Bharat Pay". Admin can manage aliases from the UI (built in Phase 2).

### 5.1 — `pipeline/entity_resolver.py`

**Exact match:**
```python
def exact_match(name: str, entity_type: str, supabase) -> str | None:
    # Query startup_aliases or investor_aliases table for exact name match
    # Returns canonical name if found, None otherwise
```

**Fuzzy match:**
```python
def fuzzy_match(name: str, entity_type: str, supabase) -> list[dict]:
    # Pull all canonical names + aliases from DB
    # Apply rapidfuzz.fuzz.token_sort_ratio against all
    # Return top 3 matches with scores
    # score >= 92 → probable match
    # score 75-91 → possible match (send to review queue)
    # score < 75 → likely new entity
```

**Contextual boosting:**
```python
def boost_score(match: dict, extracted: dict) -> float:
    # If city matches → +0.05
    # If sector matches → +0.05
    # If amount is in typical range for the stage → +0.03
    # Returns adjusted score
```

### 5.2 — `pipeline/requirements.txt` addition

```
rapidfuzz==3.9.1
```

### 5.3 — Integration with extraction pipeline

In `pipeline/extractor.py`, after extracting company name:
```python
canonical = exact_match(company) or fuzzy_match(company)
if canonical and score >= 0.92:
    resolved_company = canonical
    resolution_confidence = score
elif canonical and score >= 0.75:
    # send to review with suggested match
    suggested_company = canonical
    match_confidence = score
else:
    # new entity
    resolved_company = company
    resolution_confidence = 0.5
```

### 5.4 — Auto-alias on admin approval

When admin approves a review queue item:
- If the extracted name differs from the canonical name used → automatically insert the extracted name into `startup_aliases`

**File: `app/api/admin/review/[id]/route.ts`** — add alias insertion logic to the approve handler.

### 5.5 — Known aliases seed data

**File: `supabase/seed_aliases.sql`**

Seed the most common known aliases so entity resolution works from day one:
```sql
insert into investor_aliases (investor_name, alias_name) values
  ('Peak XV Partners', 'Sequoia Capital India'),
  ('Peak XV Partners', 'Sequoia India'),
  ('Nexus Venture Partners', 'Nexus VP'),
  -- etc.
```

---

## Phase 6 — Analytics & Weekly Reports

> **Goal:** All analytics charts read from Supabase. A new `/reports` page auto-generates weekly and monthly funding digests from verified DB records. Every chart has a "View data" link.
>
> **Exit criteria:** `/analytics` and `/reports` work entirely from live DB data. A weekly report can be generated for any given week from the UI.

### 6.1 — Wire analytics page to live DB

**File: `app/analytics/page.tsx`** — remove `import { fundingData }`. Replace with:
```ts
const deals = await getDeals({ limit: 9999 }) // fetch all for analytics
```
Or better: create aggregation functions in `lib/db/analytics.ts` that compute chart data directly in SQL (GROUP BY queries) instead of fetching all rows to the frontend.

**File: `lib/db/analytics.ts`** — add/update:
- `getMonthlyFundingByYear(year)` — returns `[{month, total_inr, deal_count}]`
- `getFundingBySector(startDate, endDate)` — returns `[{sector, total_inr, deal_count}]`
- `getFundingByStage()` — returns `[{stage, count, total_inr}]`
- `getFundingByCity()` — returns `[{city, total_inr, deal_count}]` (for India map)
- `getTopInvestorsByDeals(limit)` — returns `[{investor, deal_count, total_deployed}]`
- `getYoYComparison(year1, year2)` — returns monthly comparison data

### 6.2 — Add "View underlying data" to every chart

Each chart component (`components/charts/*.tsx`) gets a `sourceLink` prop. When provided, show a small "View data →" link below the chart that links to `/explore` pre-filtered to the same parameters the chart is showing.

Example: Sector pie chart for Fintech → link to `/explore?sector=Fintech`.

### 6.3 — Coverage notice component

**File: `components/coverage-notice.tsx`**

A banner that shows on analytics and report pages:
```
Data coverage: 1,695 verified records from Q1 FY24 onwards.
Records before this date may be incomplete.
```
The dates are read from the DB (`SELECT MIN(deal_date) FROM deals WHERE record_status = 'verified'`).

### 6.4 — Weekly reports page

**File: `app/reports/page.tsx`** — list of available weekly and monthly reports

**File: `app/reports/[period]/page.tsx`** — individual report page

A report for a given week/month shows:
- Header: "India Startup Funding — Week of [date]"
- Summary stats: total capital deployed, number of deals, new startups
- Top 5 deals (company, amount, stage, sector)
- Breakdown by sector (bar chart, small)
- Breakdown by stage (donut chart, small)
- Most active investors this period
- AI trend summary (labeled) — see Phase 7
- All deals in this period as a table with source links

**File: `app/api/reports/[period]/route.ts`** — returns report data for a given `period` parameter (e.g., `2026-W20` for week 20 of 2026, `2026-05` for May 2026).

### 6.5 — Sitemap update

**File: `app/sitemap.ts`** — add report pages to sitemap generation.

---

## Phase 7 — AI Layer

> **Goal:** Add Claude API as an intelligence layer on top of verified data. Three features: AI trend summaries on reports, natural language search, and sector classification for ambiguous records. All AI output is clearly labeled.
>
> **Exit criteria:** Reports have AI-written summaries. Users can type "which fintech startups raised Series A in Bangalore this year?" and get cited results. Cost stays under $10/month.

### 7.1 — Environment setup

Add to Vercel env vars and `.env.local`:
```
ANTHROPIC_API_KEY=
```

Install SDK: `npm install @anthropic-ai/sdk`

### 7.2 — AI trend summaries for reports

**File: `lib/ai/trend-summary.ts`**

```ts
export async function generateTrendSummary(reportData: ReportData): Promise<string>
```

Input: aggregated stats (total deployed, top sectors, top deals, YoY change).
Output: 2–3 paragraph narrative, cached in a `report_summaries` Supabase table keyed by period. If cache exists and is < 7 days old, return cache instead of calling API.

Prompt template:
```
You are summarizing India startup funding data for a weekly digest.
Write 2-3 short paragraphs covering: total capital deployed, notable deals, 
sector trends, and any patterns worth calling out.
Be factual. Only state what the data shows. Do not speculate.

Data: {JSON summary}
```

On the report page, show the summary in a labeled box:
```
[AI SUMMARY — generated from verified records]
```

### 7.3 — Natural language search

**File: `app/search/page.tsx`** — new page with a text input for NL queries

**File: `lib/ai/nl-search.ts`**

```ts
export async function naturalLanguageSearch(query: string): Promise<{deals: Deal[], explanation: string}>
```

Process:
1. Parse the query with Claude to extract filter parameters (sector, stage, city, date range, amount range, investor name)
2. Apply those filters as a normal DB query (`getDeals(filters)`)
3. Return results + a one-line explanation of how the query was interpreted

Example: "fintech Series A in Bangalore 2025" → parsed to `{sectors: ['Fintech'], stages: ['Series A'], location: 'Bangalore', years: ['2025']}` → run DB query.

This uses AI to parse the query, NOT to hallucinate results. Every result is a real verified DB record.

### 7.4 — Sector classification

**File: `lib/ai/sector-classifier.ts`**

```ts
export async function classifySector(company: string, description: string): Promise<{sector: string, confidence: number}>
```

Used in the extraction pipeline when `extract_sector()` returns confidence < 0.6. Called as a last resort before sending to review queue.

Caches results in a `sector_cache` table (company → sector) to avoid repeated calls.

### 7.5 — AI cost controls

**File: `lib/ai/usage-logger.ts`**

Log every AI API call to a `ai_usage_log` Supabase table:
```sql
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  use_case text,
  input_tokens int,
  output_tokens int,
  cached boolean default false,
  created_at timestamptz default now()
);
```

**File: `app/admin/ai-usage/page.tsx`** — show monthly token usage and estimated cost in admin panel.

### 7.6 — AI labeling everywhere

All AI-generated content must be wrapped in:
```tsx
<AILabel>AI-generated summary — based on verified records. May contain errors.</AILabel>
```

**File: `components/ai-label.tsx`** — a small styled badge/banner component for this.

---

## Phase 8 — Public API v1

> **Goal:** A versioned, documented, rate-limited public REST API that developers and researchers can use to query the funding database.
>
> **Exit criteria:** All v1 endpoints return data. API key registration works. Docs page is live at `/api-docs`. API passes a basic test suite.

### 8.1 — Versioned API routes

Create `app/api/v1/` directory with these routes:

**`app/api/v1/startups/route.ts`**
```
GET /api/v1/startups?sector=fintech&city=bangalore&page=1&limit=20
```

**`app/api/v1/startups/[id]/route.ts`**
```
GET /api/v1/startups/:id  — full deal history for a company
```

**`app/api/v1/funding-rounds/route.ts`**
```
GET /api/v1/funding-rounds?sector=edtech&stage=series_a&from=2024-01-01&to=2024-12-31
```

**`app/api/v1/investors/[id]/route.ts`**
```
GET /api/v1/investors/:id  — investor profile + deal history
```

**`app/api/v1/trends/monthly/route.ts`**
```
GET /api/v1/trends/monthly?year=2024&sector=healthtech
```

**`app/api/v1/trends/sectors/route.ts`**
```
GET /api/v1/trends/sectors?from=2024-01-01&to=2024-12-31
```

**`app/api/v1/search/route.ts`**
```
GET /api/v1/search?q=fintech+startup+bangalore
```

### 8.2 — Standard response envelope

**File: `lib/api/response.ts`**

All v1 responses follow this structure:
```ts
function apiResponse(data: unknown[], total: number, page: number, limit: number) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      coverage_note: "Data complete from 2024-01-01 onwards",
    }
  }
}
```

### 8.3 — API key system

**File: `supabase/migrations/014_api_keys.sql`**
```sql
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,  -- store hash, not raw key
  label text,
  email text not null,
  requests_today int default 0,
  last_reset date default current_date,
  created_at timestamptz default now()
);
```

**File: `app/api-keys/page.tsx`** — public registration page. User enters email, gets an API key emailed to them (or shown once on screen).

**File: `lib/api/auth.ts`** — validate API key from `X-API-Key` header. Hash and compare against DB.

**Rate limits (update `lib/rate-limit.ts`):**
- No API key: 30 requests/minute
- Valid API key: 120 requests/minute
- Add `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers to all v1 responses

### 8.4 — API documentation page

**File: `app/api-docs/page.tsx`**

Static page documenting all v1 endpoints with:
- Endpoint URL and method
- Query parameters with types and descriptions
- Example request (curl)
- Example response (JSON)
- Authentication section
- Rate limit information

### 8.5 — API test suite

**File: `tests/api/v1.test.ts`** — basic tests for each endpoint:
- Returns 200 with correct structure
- Pagination works
- Filters return correct subsets
- Rate limit headers present

Run with `npm test`.

---

## Phase 9 — Production Polish & Launch

> **Goal:** Everything is tight, fast, mobile-friendly, and ready to share publicly. This phase has no new features — only hardening, performance, and finishing touches.
>
> **Exit criteria:** Lighthouse score ≥ 90 on all pages. No TypeScript errors. All pages mobile-responsive. Sitemap submitted to Google. README complete.

### 9.1 — Performance

**Database indexes** (`supabase/migrations/015_performance_indexes.sql`):
```sql
create index if not exists idx_deals_date on deals(deal_date desc);
create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_deals_location on deals(location);
create index if not exists idx_deals_sectors on deals using gin(sectors);
create index if not exists idx_deals_investors on deals using gin(investors);
create index if not exists idx_deals_amount on deals(amount_inr desc);
```

**Response caching:** Add `Cache-Control` headers to API responses that don't change frequently (sectors list, stats, etc.):
```ts
return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600" } })
```

### 9.2 — Mobile audit

Go through every page on a 375px viewport:
- `app/explore/page.tsx` — filter panel collapses properly on mobile
- `app/analytics/page.tsx` — charts don't overflow
- `app/deal/[id]/page.tsx` — stat cards stack correctly
- `app/investors/[id]/page.tsx` — tables scroll horizontally
- `app/admin/review/page.tsx` — review UI usable on tablet

Fix any layout issues found.

### 9.3 — SEO

**File: `app/layout.tsx`** — already improved. Verify OpenGraph image exists at `public/og-image.png`.

**File: `app/sitemap.ts`** — ensure it includes: all deal pages, all investor pages, all sector pages, all report pages, api-docs.

Add JSON-LD structured data to deal detail pages:
```json
{
  "@type": "Article",
  "headline": "Company raises $XM Series A",
  "datePublished": "2026-01-15"
}
```

### 9.4 — Error handling audit

- Every page has an `error.tsx` boundary — ✅ already exists for most
- Add `error.tsx` to any pages missing it: `app/reports/`, `app/admin/`
- Sentry is already wired — verify `SENTRY_DSN` env var is set in Vercel

### 9.5 — README

**File: `README.md`**

Write a proper README:
- What this project is (1 paragraph)
- Live URL
- Features list
- Tech stack
- Local development setup
- How to run the pipeline
- How to use the API
- Contributing

### 9.6 — Final build check

```bash
npx tsc --noEmit          # zero TypeScript errors
npm run build             # clean build, no warnings
npm run test              # all API tests pass
```

Deploy to Vercel. Submit sitemap to Google Search Console.

---

## Phase Summary Table

| Phase | Name | Key Output | Estimated Days |
|---|---|---|---|
| 0 | ✅ Done | Frontend, static data, auth | — |
| 1 | Supabase Live DB | Real DB, all pages read from Supabase | 4–6 days |
| 2 | Admin Interface | Review queue, entity manager, pipeline logs | 8–12 days |
| 3 | Discovery Pipeline | RSS poller, keyword filter, article queuing | 6–10 days |
| 4 | Extraction Pipeline | Rule-based + AI extraction, auto-approval | 8–14 days |
| 5 | Entity Resolution | Fuzzy matching, alias system, dedup | 6–10 days |
| 6 | Analytics & Reports | Live DB charts, weekly/monthly reports | 5–8 days |
| 7 | AI Layer | Trend summaries, NL search, sector classifier | 6–10 days |
| 8 | Public API v1 | Versioned API, API keys, docs | 5–8 days |
| 9 | Polish & Launch | Perf, mobile, SEO, README | 3–5 days |
| | **Total** | | **51–83 days** |

---

## How to Use This Document

When you say **"implement Phase N"**:
1. Every numbered task in that phase gets built
2. New files are created exactly as described
3. Existing files are edited, not replaced wholesale
4. Each phase ends with a local `npm run build` passing clean

When a phase is done, the exit criteria at the top of the phase are verified before moving on.

---

*Last updated: May 2026*
*Based on PROJECT_REFERENCE.md v1.0*
