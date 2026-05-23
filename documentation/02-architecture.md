# 02 — Architecture

## The four layers

```
┌─────────────────────────────────────────────────────────────┐
│  1. Frontend (Next.js 14, App Router)                       │
│     app/, components/, lib/                                 │
│     Pages: /, /explore, /analytics, /deal/[id],             │
│            /investors, /sectors, /live, /admin, /submit     │
│     Hosted on Vercel.                                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          │   Server-side reads + auth
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Database (Supabase Postgres)                            │
│     supabase/migrations/001…015                             │
│     10+ tables — deals, sources, review_queue, aliases,     │
│     investors, sectors, pipeline_jobs, user_profiles, etc.  │
│     RLS policies enforce who can read/write what.           │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │   Service-role writes
                          │
┌─────────────────────────────────────────────────────────────┐
│  3. Pipeline (Python, runs on a schedule)                   │
│     pipeline/                                               │
│     Discovery → Fetch → Extract → Resolve → Dedup → Route   │
│     Writes to deals (auto-approved) or review_queue.        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │   AI extraction calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. AI Layer (Anthropic Claude)                             │
│     Today: Claude Haiku for funding-event extraction        │
│     Tomorrow (Phase 7): trend summaries, NL search,         │
│                         sector classification               │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1 — Frontend

Next.js 14 with the App Router. Server components for SEO-friendly pages, client components for interactivity (filters, charts, live feed).

| Directory | What lives there |
|---|---|
| `app/` | Routes. Each folder is a URL segment. `app/page.tsx` is the home page; `app/deal/[id]/page.tsx` is each deal's detail page. |
| `app/api/` | Server-only API routes — search, export, admin actions, weekly digest |
| `app/admin/` | The admin console (auth-gated) — review, entities, sources, pipeline, import, export |
| `components/` | Reusable UI — `deal-card.tsx`, `filter-panel.tsx`, `charts/`, etc. |
| `lib/` | Non-UI logic — Supabase client (`supabase.ts`), DB query helpers (`lib/db/*`), search, formatting, validation |
| `data/funding-data.ts` | The original static dataset (1695 deals). Still used as a fallback when Supabase is empty or not configured. |
| `hooks/` | React hooks for filters, debouncing, bookmarks, etc. |
| `middleware.ts` | Auth, geo, and route protection middleware |

**Key file to understand:** `lib/db/deals.ts`. It contains `getDeals(filters)` which tries Supabase first and falls back to `data/funding-data.ts` if Supabase is empty. This dual-source pattern is how we migrate gradually — the frontend works whether or not the live DB is populated.

## Layer 2 — Database

Supabase is hosted Postgres + auth + realtime + storage. We use Postgres and auth heavily, realtime for the `/live` feed, storage not yet.

| Tab | What it covers |
|---|---|
| Migrations | `supabase/migrations/001…015` — schema, RLS, functions, views |
| Seed data | `supabase/seed.sql`, `supabase/seed_aliases.sql` — sector taxonomy and known alias mappings |
| RLS | Row-level security. Public reads on `deals` (verified only); admin-only writes; per-user reads on saved searches and alerts. |

For the full table map see [03-data-model.md](03-data-model.md).

## Layer 3 — Pipeline

A Python module under `pipeline/`. Not a long-running service — a CLI you run on a cron (locally or via GitHub Actions / a worker). Each run is additive: it picks up where the last one left off via URL-level dedup.

| File | Job |
|---|---|
| `pipeline/run.py` | Orchestrator. Parses CLI args, walks candidate URLs, calls each step. |
| `pipeline/discovery.py` | Walks daily-partitioned sitemaps to find new candidate article URLs. |
| `pipeline/fetcher.py` | Downloads the article HTML, extracts the body. Falls back to Wayback Machine if the origin is dead. |
| `pipeline/wayback.py` | Wayback availability client. |
| `pipeline/extractor.py` | Calls Claude Haiku with a strict JSON schema to extract structured deal fields. SQLite-cached so re-runs do not re-pay. |
| `pipeline/currency.py` | Converts amount + currency from the extractor into amount_inr and amount_usd. |
| `pipeline/entity_resolver.py` | Maps free-text names ("Sequoia India") to canonical entities ("Peak XV Partners"). Exact alias hit, then rapidfuzz. |
| `pipeline/dedup.py` | URL-level (against `sources`) and deal-level (same company + amount + 30-day window against `deals`). |
| `pipeline/queue.py` | Supabase write helpers — `insert_source`, `insert_review_item`, `insert_deal`, `log_job_run`. |
| `pipeline/config.py` | Source registry, model name, URL filters. |

For the full data flow see [04-pipeline.md](04-pipeline.md).

## Layer 4 — AI

Today, the only AI dependency is **Anthropic Claude Haiku** for funding-event extraction (`pipeline/extractor.py`). It is called once per fetched article, the JSON response is cached on disk by URL + body hash, and re-runs cost nothing for already-seen articles.

Future AI (Phase 7) will add:
- Weekly trend summaries
- Natural-language search ("show me Series A fintech rounds led by Peak XV in 2026")
- Sector classification when keyword matching is ambiguous

## How data flows on a typical request

### A user loads `/analytics`

1. Next.js server component runs `getMonthlyFunding()` from `lib/db/analytics.ts`.
2. That function calls Supabase: `select … from deals where record_status='verified'`.
3. Postgres runs the aggregate and returns rows.
4. The page renders charts with the rows. If Supabase is unconfigured or returns empty, it falls back to aggregating `data/funding-data.ts`.

### A user submits a deal via `/submit`

1. Form posts to `app/api/submit/route.ts`.
2. That handler validates with `lib/validation.ts` and inserts into the `submissions` table with `status='pending'`.
3. The submission appears in the admin review queue under a "community submissions" tab.

### The pipeline ingests a new article

1. Cron triggers `python -m pipeline.run --source entrackr --since 2026-05-23`.
2. Discovery walks Entrackr's sitemap for URLs from that date forward.
3. For each URL: URL-dedup check → fetch → AI extract → currency norm → entity resolve → deal-level dedup.
4. If confidence ≥ 0.80 and no duplicate, `insert_deal` writes a row to `deals` with `record_status='verified'`.
5. Otherwise `insert_review_item` writes to `review_queue` for admin review.
6. A row goes to `pipeline_jobs` summarizing the run.

## Where things are deployed

| Component | Host |
|---|---|
| Frontend | Vercel (auto-deploy on push to `main`) |
| Database | Supabase managed Postgres |
| Pipeline | Currently runs locally / on demand. Production cron is Phase 3 wrap-up. |
| AI | Anthropic API (cloud) |
