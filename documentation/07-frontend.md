# 07 — Frontend

The public site is a Next.js 16 app under `app/`. Every route here is a folder. This page walks through every user-facing page and tells you exactly where its data comes from.

## The pages

```
/                       Home / dashboard
/explore                Search and filter the dataset
/deal/[id]              One deal's detail page
/investors              Investor list
/investors/[slug]       One investor's portfolio
/sectors                Sector list with stats
/sectors/[slug]         One sector's deals
/analytics              Charts — monthly, sector, stage, city, top investors
/live                   Realtime feed of newly verified deals
/submit                 Community submission form
/login, /profile        Auth pages
/admin/*                Admin console — see 05-admin.md
/api/*                  Server-side API routes
```

## The data-source pattern

Every page reads from one of two places, controlled by `lib/supabase.ts:isSupabaseConfigured`:

| Source | When |
|---|---|
| **Supabase `deals` table** | When Supabase env vars are set AND the query returns at least one verified row. |
| **`data/funding-data.ts`** (the generated 14,700+ deal file) | When Supabase is unconfigured (local dev with no env), or when Supabase returns empty. |

This is the gradual-migration pattern. The frontend works whether the live DB is fully populated or empty. Today (May 2026) most pages still read from static data; Phase 6 wires the analytics, list, and detail pages to Supabase first.

The pattern lives in helpers like `lib/db/deals.ts:getDeals`, `lib/db/analytics.ts:fetchAll`, `lib/db/investors.ts`. Frontend code never talks to Supabase directly — always through `lib/db/*`.

## Page-by-page

### `/` — Home

**File:** `app/page.tsx` + `components/hero-stats.tsx`, `components/recent-activity.tsx`

Shows hero stats (total deals, total funding, this-month count), recent deals, and quick links to the most active sectors. Data via `getDeals({ limit: 10 })`.

### `/explore` — Search and filter

**File:** `app/explore/page.tsx`, `components/explore-client.tsx`, `components/filter-panel.tsx`, `components/deal-table.tsx`

The main "browse the dataset" page. Filters in the URL query string: `?sector=Fintech&stage=Series+A&from=2026-01-01`. Each filter change pushes a new URL so the page is shareable.

Data path: `lib/db/deals.ts:getDeals(filters)` → Supabase or static. Pagination via `lib/db/deals.ts:getPaginatedDeals`.

### `/deal/[id]` — Deal detail

**File:** `app/deal/[id]/page.tsx`, `components/deal-detail.tsx`, `components/deal-similar.tsx`

Shows everything we know about a single funding event:
- Company, amount (INR + USD), stage, date, location, sectors
- Investors list with each linking to their profile
- Source article link (P1: every record has a source)
- Similar deals (same sector + same stage)

Data path: `lib/db/deals.ts:getDealById(id)`.

### `/investors` and `/investors/[slug]`

**Files:** `app/investors/page.tsx`, `app/investors/[slug]/page.tsx`, `components/investor-card.tsx`, `components/investor-portfolio.tsx`, `components/investor-stats.tsx`

List view: all canonical investors with deal count and total deployed. Detail view: an investor's full portfolio.

Data path: `lib/db/investors.ts` — builds investor records from `deals.investors` arrays via aggregation. Note: there is no investor join table; we compute aggregates over the `deals.investors` text array.

### `/sectors` and `/sectors/[slug]`

**Files:** `app/sectors/page.tsx`, `app/sectors/[slug]/page.tsx`

Same pattern as investors but for sectors. Aggregates over `deals.sectors`.

### `/analytics` — Charts

**File:** `app/analytics/page.tsx`, `components/analytics-dashboard.tsx`, `components/charts/*`

The visual analytics page. Charts:
- Monthly funding (bar)
- Sector breakdown (pie)
- Stage distribution (bar)
- City choropleth (India map)
- Top investors leaderboard
- Year-over-year comparison

Data path: `lib/db/analytics.ts`. Each chart's data function does `select … from deals where record_status='verified'` directly on Supabase, with `GROUP BY` aggregations done in Postgres where possible. Falls back to in-memory aggregation over `funding-data.ts` if Supabase is empty.

Phase 6 work expands this — see [09-roadmap.md](09-roadmap.md).

### `/live` — Realtime feed

**File:** `app/live/page.tsx`, `components/live-deal-feed.tsx`

Subscribes to Supabase realtime channel on `deals` table. When a new row inserts with `record_status='verified'` (i.e. the pipeline auto-approved, or an admin just approved one), it appears at the top of the feed without a page refresh.

This is the only place the frontend uses Supabase realtime today.

### `/submit` — Community submission

**File:** `app/submit/page.tsx`, plus API at `app/api/submit/route.ts`

A form for anyone (logged in) to submit a deal they saw in the news that we missed. Goes into the `submissions` table with `status='pending'`. Admin can review under `/admin/review`.

### `/login`, `/profile`, `/dashboard`

**Files:** `app/login/page.tsx`, `app/profile/page.tsx`, `app/dashboard/page.tsx`

Standard Supabase auth flows. Email + password and OAuth providers. Profile lets users edit their display name, avatar, bio. Dashboard shows their bookmarks, saved searches, watchlists, and alerts.

## Notable components

| Component | What it does |
|---|---|
| `components/header.tsx` | Top nav with search bar, login state, theme toggle |
| `components/deal-card.tsx` | The card representation of a deal (used on home, sector pages, investor pages) |
| `components/deal-table.tsx` | The table representation (used on /explore) |
| `components/filter-panel.tsx` | Sidebar filters (sector, stage, amount, date range, investor) |
| `components/charts/*` | Recharts wrappers — bar, line, pie, choropleth |
| `components/coverage-notice.tsx` | The live/static coverage notice used to disclose data range and total records. |
| `components/live-deal-feed.tsx` | Realtime subscription + animated insert |
| `components/compare-panel.tsx` | Side-by-side deal comparison (saved deals) |
| `components/export-button.tsx` | Client-side CSV export of the currently filtered list |

## API routes (`app/api/*`)

Server-only endpoints. Used by the frontend (XHR / fetch) and, for some, by external integrations.

| Route | Purpose |
|---|---|
| `/api/search` | Full-text search across deals |
| `/api/stats` | Aggregate stats (total deals, funding) |
| `/api/export` | CSV / JSON export of the filtered dataset |
| `/api/health` | Health check for monitoring |
| `/api/submit` | Community submission |
| `/api/alerts`, `/api/bookmarks`, `/api/saved-searches`, `/api/watchlist` | User-feature CRUD |
| `/api/notify` | Email digest delivery |
| `/api/weekly` | Weekly digest data |
| `/api/admin/*` | Admin actions (approve, reject, merge, alias CRUD, source CRUD) |
| `/api/auth/*` | Supabase auth callbacks |

API v1 now lives under `/api/v1/*` with API keys, rate-limit tiers, and docs at `/api-docs`.

## State and theming

- No global state library (Redux, Zustand) — server components and URL query params do most of the work.
- Theming via `next-themes`. Dark mode is the default.
- Tailwind for styles, shadcn/ui for primitives.
- Sentry for client-side error tracking (`lib/sentry.ts`).
