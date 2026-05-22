# India Startup Funding Intelligence Platform
### Complete Project Reference Document
> This document defines the full vision, architecture, data model, pipeline, and feature set of the project in its 100% completed state. It is intended as a reference for agents, contributors, and future development.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Vision at 100% Completion](#3-vision-at-100-completion)
4. [Scope](#4-scope)
5. [Core Design Principles](#5-core-design-principles)
6. [Database Schema](#6-database-schema)
7. [Data Pipeline Architecture](#7-data-pipeline-architecture)
8. [Source Strategy](#8-source-strategy)
9. [Entity Resolution System](#9-entity-resolution-system)
10. [Review & Quality Control System](#10-review--quality-control-system)
11. [Frontend — User-Facing Application](#11-frontend--user-facing-application)
12. [Admin Interface](#12-admin-interface)
13. [AI Layer](#13-ai-layer)
14. [API Layer](#14-api-layer)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)
16. [Development Roadmap](#16-development-roadmap)
17. [Success Metrics](#17-success-metrics)
18. [Non-Goals](#18-non-goals)
19. [Glossary](#19-glossary)

---

## 1. Project Overview

**Project Name:** India Startup Funding Intelligence Platform
**Focus:** India-only startup funding activity
**Type:** Data product + web application
**Built by:** Solo student developer (weekend project)
**Primary goal:** Turn scattered, noisy public startup funding data into a structured, sourced, continuously updated intelligence system

This project is not a news site. It is not a clone of Crunchbase. It is a focused, high-trust, India-specific funding database with explainable analytics, a clean data pipeline, and an AI intelligence layer built on top of verified records.

---

## 2. Problem Statement

Startup funding data in India is:

- **Scattered** across dozens of news sites, press releases, and social posts
- **Inconsistent** in naming, currency, and round classification
- **Unsourced** in most aggregators
- **Incomplete** historically — gaps in coverage create misleading trend charts
- **Unstructured** — no canonical startup identity, no deduplication, no investor mapping

Existing platforms either charge for access (Tracxn, Crunchbase), cover India shallowly, or publish raw news without structured data.

This project fills the gap: a free, structured, source-backed, India-focused funding intelligence platform.

---

## 3. Vision at 100% Completion

At 100%, this platform:

- Maintains a **continuously updated database** of Indian startup funding events
- Covers **every meaningful funding round announced in India** from a defined start date onwards
- Attaches a **verified source URL** to every record
- Provides a **canonical identity** for every startup and investor
- Runs an **automated discovery pipeline** that surfaces new funding articles daily
- Has a **human-in-the-loop review queue** that keeps data quality high
- Exposes **rich analytics** — sector trends, investor activity, city maps, stage distributions
- Has an **AI layer** that summarizes trends, classifies ambiguous records, and answers natural language questions
- Publishes a **public API** for developers and researchers
- Generates **weekly and monthly reports** automatically

The platform is useful without the AI layer. The AI layer makes it exceptional.

---

## 4. Scope

### Included
- Indian startups only
- Funding rounds and funding announcements
- Round types: Pre-Seed, Seed, Series A through F, Growth, Debt, Bridge, Undisclosed
- Investor entities: VC firms, angel investors, family offices, corporate ventures, government funds
- Sectors and sub-sectors (see Sector Taxonomy section)
- City and state-level geography
- Source-linked records
- Historical data from 2020 onwards (best effort before pipeline start date)
- Continuous coverage from pipeline start date onwards

### Excluded
- Global startup coverage outside India
- Valuation data unless publicly stated
- Secondary market transactions
- Real-time stock or public market data
- Acquisition details (tracked as a separate event type, not core)
- Unverifiable or rumored funding rounds

---

## 5. Core Design Principles

### P1 — Source-backed data
Every funding event must link to at least one source URL. No sourceless records enter the verified dataset.

### P2 — Canonical identity
Every startup and investor has one canonical record. Aliases, alternate spellings, and rebrand names map to the canonical entity. The database never has two rows for the same company.

### P3 — Normalized structure
Startups, funding rounds, investors, and sources are separate tables with proper foreign key relationships. No denormalized "one giant table" approach.

### P4 — Incremental updates
The pipeline adds and updates records without rebuilding from scratch. Every run is additive.

### P5 — Human verification
Uncertain or auto-extracted records go to a review queue before entering the verified dataset. A human approves, rejects, or merges them.

### P6 — Explainable analytics
Every chart and metric derives directly from underlying records. If a trend cannot be traced to individual verified funding events, it does not ship.

### P7 — Cost efficiency
Expensive AI calls are reserved for ambiguous cases and high-value summaries. Deterministic rules handle the common case.

### P8 — Honest data labeling
Coverage gaps are disclosed. Charts show date ranges. The UI tells users what is verified vs. estimated.

---

## 6. Database Schema

### 6.1 `startups`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `canonical_name` | TEXT | Official, cleaned company name |
| `founded_year` | INT | Year of founding |
| `headquarters_city` | TEXT | City of primary HQ |
| `headquarters_state` | TEXT | State of primary HQ |
| `sector_primary` | TEXT | Primary sector tag (FK to sector_tags) |
| `sector_secondary` | TEXT | Optional secondary sector tag |
| `website` | TEXT | Company website URL |
| `description` | TEXT | One-paragraph company description |
| `linkedin_url` | TEXT | Optional |
| `verification_status` | ENUM | `verified`, `unverified`, `flagged` |
| `created_at` | TIMESTAMP | When record was created |
| `updated_at` | TIMESTAMP | Last modification time |

---

### 6.2 `startup_aliases`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `startup_id` | UUID | FK to startups |
| `alias_name` | TEXT | Alternate name or spelling |
| `alias_type` | ENUM | `former_name`, `alternate_spelling`, `short_name`, `brand_name` |

---

### 6.3 `funding_rounds`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `startup_id` | UUID | FK to startups |
| `round_type` | ENUM | `pre_seed`, `seed`, `series_a` … `series_f`, `growth`, `debt`, `bridge`, `undisclosed` |
| `amount_original` | NUMERIC | Amount as reported |
| `currency_original` | TEXT | Currency as reported (INR, USD, etc.) |
| `amount_usd` | NUMERIC | Normalized USD equivalent |
| `fx_rate_used` | NUMERIC | Exchange rate applied for conversion |
| `announced_date` | DATE | Date of public announcement |
| `closed_date` | DATE | Date round closed (if known) |
| `date_confidence` | ENUM | `exact`, `month_only`, `quarter_only`, `estimated` |
| `lead_investor_id` | UUID | FK to investors (nullable) |
| `source_id` | UUID | FK to sources |
| `stage_confidence` | ENUM | `confirmed`, `inferred`, `uncertain` |
| `record_status` | ENUM | `verified`, `needs_review`, `rejected`, `merged` |
| `merged_into_id` | UUID | FK to funding_rounds if merged |
| `notes` | TEXT | Internal notes for reviewers |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### 6.4 `round_investors`

Junction table for many-to-many between funding_rounds and investors.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `round_id` | UUID | FK to funding_rounds |
| `investor_id` | UUID | FK to investors |
| `role` | ENUM | `lead`, `participating`, `unknown` |

---

### 6.5 `investors`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `canonical_name` | TEXT | Official investor name |
| `investor_type` | ENUM | `vc`, `angel`, `corporate_vc`, `family_office`, `government`, `accelerator`, `unknown` |
| `website` | TEXT | |
| `headquarters_country` | TEXT | |
| `description` | TEXT | Optional |
| `verification_status` | ENUM | `verified`, `unverified` |
| `created_at` | TIMESTAMP | |

---

### 6.6 `investor_aliases`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `investor_id` | UUID | FK to investors |
| `alias_name` | TEXT | Alternate name |

---

### 6.7 `sources`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `source_type` | ENUM | `news_article`, `press_release`, `weekly_roundup`, `regulatory_filing`, `social_post`, `manual_entry` |
| `title` | TEXT | Article or page title |
| `url` | TEXT | Canonical URL |
| `publication_date` | DATE | |
| `publisher` | TEXT | e.g., "Entrackr", "Inc42" |
| `reliability_tier` | ENUM | `tier_1`, `tier_2`, `tier_3` (see Source Strategy) |
| `extraction_method` | ENUM | `manual`, `rss_auto`, `scraper`, `ai_extracted` |
| `raw_text_snapshot` | TEXT | Full article text at time of extraction (for audit) |
| `created_at` | TIMESTAMP | |

---

### 6.8 `sector_tags`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `sector_name` | TEXT | e.g., "Fintech", "Healthtech" |
| `parent_sector` | TEXT | e.g., "Technology" |
| `description` | TEXT | Optional |

#### Predefined Sector Taxonomy

- Fintech → Payments, Lending, Insurtech, Wealthtech, Neobanking
- Healthtech → Telemedicine, Diagnostics, Pharmatech, Mental Health, Med Devices
- Edtech → K12, Higher Ed, Upskilling, EdInfra
- D2C → FMCG, Fashion, Beauty, Food & Beverage
- Agritech → Farm Inputs, Market Linkage, Agri Finance, Food Supply Chain
- Logistics → Last Mile, B2B Freight, Cold Chain, Warehousing
- SaaS → B2B SaaS, HR Tech, Sales Tech, Dev Tools
- Climate → Clean Energy, EV, Carbon, Sustainable Packaging
- Gaming → Mobile Gaming, Esports, Gaming Infra
- Real Estate → Proptech, Construction Tech, Co-living
- Mobility → Ride Hailing, EV Infra, Fleet Management
- Media & Entertainment → OTT, Creator Economy, Sports
- Deep Tech → AI/ML Infra, Space, Semiconductors, Robotics

---

### 6.9 `pipeline_jobs`

Tracks each pipeline run for observability.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `run_at` | TIMESTAMP | When the run started |
| `source_id` | UUID | FK to sources |
| `articles_fetched` | INT | Total articles discovered |
| `articles_filtered` | INT | Passed keyword filter |
| `records_extracted` | INT | Records sent to review queue |
| `records_auto_approved` | INT | Auto-approved (high confidence) |
| `records_flagged` | INT | Sent to human review |
| `run_status` | ENUM | `success`, `partial`, `failed` |
| `error_log` | TEXT | Any errors during the run |

---

### 6.10 `review_queue`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `source_id` | UUID | FK to sources |
| `raw_extracted_data` | JSONB | What the parser extracted |
| `suggested_startup_id` | UUID | Best entity match found |
| `match_confidence` | FLOAT | 0.0–1.0 entity match score |
| `status` | ENUM | `pending`, `approved`, `rejected`, `merged`, `needs_more_info` |
| `reviewed_by` | TEXT | Admin user who reviewed |
| `reviewed_at` | TIMESTAMP | |
| `notes` | TEXT | Reviewer notes |
| `created_at` | TIMESTAMP | |

---

## 7. Data Pipeline Architecture

### 7.1 Overview

```
┌─────────────────────────────────────────┐
│           DISCOVERY LAYER               │
│  RSS Feeds → Keyword Filter → URL Queue │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           EXTRACTION LAYER              │
│  Fetch Article → Clean HTML → Parse     │
│  Structured Fields (rules-first)        │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│        ENTITY RESOLUTION LAYER          │
│  Match Startup Name → Canonical Entity  │
│  Match Investor Names → Canonical Entity│
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│        DEDUPLICATION LAYER              │
│  Check: Same startup + same date        │
│  + same amount = likely duplicate       │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           REVIEW QUEUE                  │
│  High confidence → auto_approved        │
│  Low confidence → human review          │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           VERIFIED DATABASE             │
│  Clean records → Analytics → AI Layer   │
└─────────────────────────────────────────┘
```

### 7.2 Discovery Layer

**Primary sources polled:**
- `entrackr.com/category/report/feed` — weekly roundup articles (highest priority)
- `inc42.com/feed` — general startup news, filtered for funding keywords
- `yourstory.com/feed` — supplementary
- Google Alerts RSS for `"Indian startup" "raises" "funding"` — broad catch-all

**Polling cadence:** Twice daily (8 AM and 8 PM IST)

**Keyword filter (any match triggers extraction):**
- raises, raised, funding, funded, secured, closed round
- Series A, Series B, Series C, Series D, Series E, Series F
- seed round, pre-seed, bridge round, debt round
- backed by, led by, co-led by, participated by
- crore, million, billion (amount indicators)

**Output:** A queue of URLs with title, source, and date that passed the filter.

### 7.3 Extraction Layer

**Step 1 — Fetch**
- Download article HTML
- Strip ads, navigation, comments
- Extract main content body

**Step 2 — Rule-based extraction (attempt first)**
Pattern matching for:
- Amount: regex for `$X Mn`, `INR X crore`, `Rs X lakh` etc.
- Round type: keyword matching against round type vocabulary
- Startup name: named entity recognition or first capitalized entity near "raises"
- Investor names: entities following "led by", "backed by", "participated"
- Date: publication date from article metadata

**Step 3 — AI extraction (fallback only)**
If rule-based extraction confidence < 0.7, send article text to Claude API with a structured extraction prompt. Returns JSON with fields and confidence scores.

**Step 4 — Currency normalization**
- All amounts converted to USD using historical FX rate for announcement date
- FX rate stored alongside conversion for auditability

### 7.4 Deduplication Logic

A new record is flagged as a potential duplicate if:
- Same `startup_id` AND same `round_type` AND `announced_date` within 30 days
- OR same `startup_id` AND same `amount_usd` AND `announced_date` within 60 days

Duplicates go to review queue with `status = needs_review` and a link to the existing record.

### 7.5 Confidence Scoring

Each extracted record gets an overall `confidence_score` (0.0–1.0):

| Field | Weight |
|---|---|
| Source reliability tier | 0.25 |
| Amount extracted cleanly | 0.20 |
| Round type confirmed | 0.15 |
| Startup entity matched | 0.20 |
| Date extracted precisely | 0.10 |
| Investors identified | 0.10 |

**Score >= 0.80** → `auto_approved`
**Score 0.50–0.79** → `needs_review`
**Score < 0.50** → `flagged` (requires manual entry)

---

## 8. Source Strategy

### Tier 1 — Highest Reliability
Direct, authoritative announcements. Auto-trust.
- Company press releases
- Investor official blog posts
- Regulatory filings (MCA, SEBI disclosures)
- Government scheme announcements (DPIIT, Startup India)

### Tier 2 — Reliable Media
Established India startup journalism. High trust.
- Entrackr (weekly roundups especially)
- Inc42
- YourStory
- The Ken (startup coverage)
- Economic Times Startup
- Mint (startup section)
- Business Standard (startup section)

### Tier 3 — Secondary Discovery
Useful for discovery, lower trust for extraction.
- General business news sites
- LinkedIn posts by founders or investors
- Twitter/X announcements
- Press release aggregators

**Rule:** Tier 3 sources must be corroborated by a Tier 1 or Tier 2 source before a record is auto-approved.

---

## 9. Entity Resolution System

### 9.1 The Problem

The same startup may appear as:
- "BharatPe" / "Bharat Pay" / "Bharat Pe"
- Investors: "Sequoia Capital India" / "Peak XV Partners" (rebranded)
- Rebrand: "Dunzo" after acquisition may operate under a new name

### 9.2 Resolution Process

**Step 1 — Exact match**
Check `startup_aliases` for exact string match. If found, resolve immediately.

**Step 2 — Fuzzy match**
Apply string similarity (Jaro-Winkler or token sort ratio) against all canonical names and aliases.
- Score >= 0.92 → likely match, flag for confirmation
- Score 0.75–0.91 → possible match, send to review queue
- Score < 0.75 → likely new entity, create new record

**Step 3 — Contextual features**
For uncertain matches, use additional signals:
- City match
- Sector match
- Funding amount in plausible range for the stage
- Date proximity to previously known rounds

**Step 4 — Manual review**
All uncertain entity matches go to the review queue. Admin can confirm match, reject match, or create new canonical entity.

### 9.3 Alias Management

Every time an admin confirms a match between a new name variant and a canonical entity, the variant is automatically added to `startup_aliases`. This improves future resolution without any additional work.

---

## 10. Review & Quality Control System

### 10.1 Review Queue States

| Status | Meaning |
|---|---|
| `pending` | Awaiting human review |
| `approved` | Confirmed and inserted into verified dataset |
| `rejected` | Not a valid funding event or duplicate |
| `merged` | Merged into an existing record |
| `needs_more_info` | Sent back for additional source finding |

### 10.2 Admin Review Interface

The admin review page shows each pending record with:
- Original article title + link
- Raw extracted text snippet (the paragraph the data came from)
- Extracted fields (editable inline)
- Suggested entity match + confidence score
- Link to existing record if duplicate detected
- Action buttons: Approve / Reject / Merge / Edit & Approve / Flag

### 10.3 Audit Trail

Every change to a verified record is logged:
- Who changed it (admin user)
- What changed (field diff)
- When it changed
- Why (optional note)

This ensures full traceability and allows rollback if errors are introduced.

---

## 11. Frontend — User-Facing Application

### 11.1 Pages & Features

#### Home / Dashboard
- Total funding tracked (this month, this quarter, this year)
- Top funded sectors this month
- Most active investors this month
- Latest verified funding events (last 10, live-updating)
- "Coverage from [start date] — [X] verified records"

#### Explore / Search
- Search by startup name (with alias resolution)
- Filter by: sector, city, round type, investor, date range, amount range
- Sort by: date, amount, round type
- Results as a paginated table with inline summary
- Each row links to startup detail page

#### Startup Detail Page
- Canonical name + aliases shown
- All funding rounds in chronological timeline
- Investor list per round
- Source links for every round
- Sector, city, founded year
- Company description

#### Investor Page
- Investor canonical name + type
- All deals they participated in (with startup links)
- Most active sectors
- Average check size (where disclosed)
- Timeline of activity

#### Trends Dashboard
- Funding by month/quarter (bar chart, filterable by sector)
- Funding by sector (pie / treemap)
- Funding by city (India map choropleth)
- Stage distribution over time (stacked bar)
- Average deal size by stage (line chart)
- Investor deal frequency (leaderboard)
- Emerging sectors (momentum score: funding growth rate)

#### Weekly / Monthly Reports Page
- Auto-generated digest: "India Startup Funding: Week of [date]"
- Total capital deployed
- Breakdown by sector
- Breakdown by stage
- Notable deals
- Investor highlights
- AI-written trend summary (labeled as AI-generated)

### 11.2 UX Principles

- Every chart has a "View underlying data" link showing the actual records
- Every funding event shows its source URL — one click to original article
- Coverage gaps are shown honestly: "Data before Jan 2024 is partial"
- Mobile responsive
- Fast — no heavy JS bundles, paginated API calls

---

## 12. Admin Interface

Separate from the public app. Accessible only to authenticated admin users.

### Features

- **Review Queue** — paginated list of pending records with all review actions
- **Pipeline Logs** — view each pipeline run, articles fetched, records extracted, errors
- **Entity Manager** — search startups and investors, edit canonical names, add aliases, merge duplicates
- **Source Manager** — add new RSS sources, set reliability tier, enable/disable sources
- **Bulk Import** — upload CSV for historical data ingestion (with same review queue flow)
- **Data Export** — download the full verified dataset as CSV or JSON

---

## 13. AI Layer

AI is used only where it adds clear value. It is not the core data engine.

### 13.1 AI Use Cases

| Use Case | When | Model Input | Output |
|---|---|---|---|
| Ambiguous extraction | Rule-based confidence < 0.7 | Article full text | Structured JSON with confidence scores |
| Sector classification | Sector unclear from name/description | Startup name + description | Sector + confidence |
| Entity match suggestion | Fuzzy score 0.75–0.91 | Name variants + context | Best match + reasoning |
| Trend summary | Weekly/monthly report generation | Aggregated stats + top deals | 2–3 paragraph narrative |
| Natural language search | User types a question | User query + DB context | Answer with cited records |
| Duplicate detection | New record vs existing | Two record JSONs | Similarity reasoning + recommendation |

### 13.2 AI Cost Controls

- All AI calls are logged with token counts
- Extraction AI calls are cached by article URL — same article never processed twice
- Trend summaries generated once per week, cached until next run
- Natural language search uses retrieval first (semantic search over records), AI only for final answer assembly
- Monthly AI spend target: under $10 at the scale of this project

### 13.3 AI Labeling

All AI-generated content in the UI is clearly labeled:
- "AI-generated summary — verify with source links below"
- "Sector classification suggested by AI — may not be exact"

AI is never presented as ground truth.

---

## 14. API Layer

A public REST API for developers and researchers.

### Endpoints

```
GET /api/v1/startups
  ?sector=fintech&city=bangalore&page=1&limit=20

GET /api/v1/startups/:id
  Returns full startup record with all funding rounds

GET /api/v1/funding-rounds
  ?sector=edtech&round_type=series_a&from=2024-01-01&to=2024-12-31

GET /api/v1/investors/:id
  Returns investor record with all deals

GET /api/v1/trends/monthly
  ?year=2024&sector=healthtech
  Returns aggregated monthly funding stats

GET /api/v1/trends/sectors
  Returns funding breakdown by sector for a given period

GET /api/v1/search
  ?q=fintech+startup+bangalore
  Returns matched startups and rounds
```

### Rate Limiting

- Unauthenticated: 30 requests/minute
- Authenticated (free API key): 120 requests/minute
- All responses include `X-RateLimit-Remaining` headers

### Response Format

All endpoints return:
```json
{
  "data": [...],
  "meta": {
    "total": 1240,
    "page": 1,
    "limit": 20,
    "coverage_note": "Data complete from 2024-01-01 onwards"
  }
}
```

---

## 15. Infrastructure & Deployment

### Tech Stack (Recommended)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js | SSR for SEO, fast page loads |
| Backend API | FastAPI (Python) or Next.js API routes | Python preferred for pipeline code reuse |
| Database | PostgreSQL | Relational, mature, strong full-text search |
| Pipeline jobs | Python scripts + APScheduler or cron | Simple, predictable |
| Hosting | Railway or Render (free tier to start) | Easy deploy, cheap |
| DB hosting | Supabase or Railway Postgres | Managed, free tier available |
| Search | PostgreSQL full-text search (start) → Meilisearch (scale) | Avoid complexity early |
| Charts | Recharts or Chart.js | Lightweight, React-compatible |
| AI calls | Anthropic Claude API | Structured extraction quality |
| Caching | Redis (optional, add when needed) | Cache pipeline results, API responses |

### Pipeline Deployment

- Pipeline scripts run as scheduled jobs (cron or APScheduler)
- Runs at 8 AM and 8 PM IST daily
- Logs stored in `pipeline_jobs` table
- Alerts (email or Telegram) if a run fails or produces 0 records unexpectedly

### Environment Variables

```
DATABASE_URL=
ANTHROPIC_API_KEY=
ADMIN_SECRET_KEY=
PIPELINE_SCHEDULE=0 8,20 * * *
FX_API_KEY=         # for currency conversion (Open Exchange Rates free tier)
```

---

## 16. Development Roadmap

### Phase 1 — Foundation (Weeks 1–4)
**Goal:** Clean data, solid schema, seed records

- [ ] Design and create PostgreSQL schema (all tables above)
- [ ] Audit and clean existing 100–200 manual records
- [ ] Add source_url and date_confidence to every existing record
- [ ] Import cleaned records into DB
- [ ] Mark each as `verified` or `needs_review`
- [ ] Set up basic Next.js frontend with a simple table view

**Exit criteria:** 100+ verified records in DB, all with source URLs

---

### Phase 2 — Discovery Pipeline (Weeks 5–8)
**Goal:** Automate new record discovery

- [ ] Set up RSS polling for Entrackr weekly roundup feed
- [ ] Build keyword filter
- [ ] Store matching articles in `sources` table
- [ ] Build `review_queue` table and basic admin review page
- [ ] Test end-to-end: RSS → filter → review queue → approve → DB

**Exit criteria:** New funding events discoverable and reviewable without manual browsing

---

### Phase 3 — Extraction (Weeks 9–12)
**Goal:** Extract structured fields from articles automatically

- [ ] Build rule-based extractor for Entrackr roundup article format
- [ ] Build currency normalization module
- [ ] Build confidence scoring
- [ ] Add AI extraction fallback for low-confidence records
- [ ] Add Inc42 feed as second source

**Exit criteria:** 70%+ of new records extracted with fields populated, not just URLs

---

### Phase 4 — Entity Resolution (Weeks 13–16)
**Goal:** Canonical startup and investor identities

- [ ] Build alias matching system
- [ ] Add fuzzy matching for startup names
- [ ] Add investor entity resolution
- [ ] Build admin entity manager UI

**Exit criteria:** No obvious duplicate companies in DB, investor names consistent

---

### Phase 5 — Analytics (Weeks 17–20)
**Goal:** Useful public-facing visualizations

- [ ] Sector funding by month chart
- [ ] Stage distribution chart
- [ ] City map (India choropleth)
- [ ] Investor activity leaderboard
- [ ] Trends dashboard page
- [ ] Startup and investor detail pages

**Exit criteria:** Dashboard useful to a first-time visitor with no explanation

---

### Phase 6 — AI Layer (Weeks 21–26)
**Goal:** AI as an intelligence layer on top of verified data

- [ ] AI trend summaries for weekly/monthly reports
- [ ] Natural language search
- [ ] AI sector classification for ambiguous startups
- [ ] Weekly report auto-generation

**Exit criteria:** AI features add measurable value, token cost under $10/month

---

### Phase 7 — Public API + Polish (Weeks 27–30)
**Goal:** Developer access and production readiness

- [ ] Public REST API with rate limiting
- [ ] API documentation
- [ ] API key registration flow
- [ ] Performance optimization (query indexes, caching)
- [ ] Mobile responsiveness audit
- [ ] SEO (meta tags, sitemap, structured data)

**Exit criteria:** Ready to share publicly and link on portfolio

---

## 17. Success Metrics

| Metric | Target at 100% |
|---|---|
| Verified funding records | 2,000+ |
| Records with source URLs | 100% |
| Source coverage from start date | > 90% of publicly announced rounds |
| Pipeline runs without errors | > 95% uptime |
| Time from announcement to DB entry | < 7 days |
| Duplicate rate in verified dataset | < 2% |
| Weekly new records added | 20–50 (depends on India deal flow) |
| AI extraction cost per month | < $10 |
| API response time (p95) | < 300ms |

---

## 18. Non-Goals

This project is explicitly NOT trying to be:

- A real-time funding news site
- A global startup database
- A valuation intelligence tool (no cap table data)
- A paid enterprise intelligence product (at this stage)
- A fully automated system with no human review
- A replacement for Crunchbase, Tracxn, or Pitchbook
- An investment advisory platform

---

## 19. Glossary

| Term | Definition |
|---|---|
| Canonical name | The single official name used to represent an entity in the DB |
| Alias | An alternate name that maps to a canonical entity |
| Entity resolution | The process of matching a name mention to a canonical entity |
| Review queue | A holding area for records that need human verification before entering the verified dataset |
| Pipeline run | One execution of the automated discovery and extraction process |
| Funding event | A single funding round announcement — the core unit of data |
| Confidence score | A 0.0–1.0 score for how reliably a record was extracted |
| Tier 1/2/3 source | Classification of source reliability (see Source Strategy) |
| Coverage gap | A date range where data collection was incomplete or absent |
| Auto-approved | A record that passed all confidence thresholds without human review |
| FX normalization | Converting original currency amounts to USD at the date's exchange rate |

---

*Document version: 1.0*
*Last updated: May 2026*
*Maintained by: Project founder*

> **Agent note:** This document defines the complete target state of the project. When implementing any feature, refer to the relevant section for schema, logic, and design constraints. Always follow Core Design Principles (Section 5) — particularly P1 (source-backed), P2 (canonical identity), and P5 (human verification). Do not skip the review queue. Do not use AI where rules suffice.
