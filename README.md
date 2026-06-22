# Arthaive

[![Code license: AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-blue.svg)](LICENSE)
[![Data license: CC BY-SA 4.0](https://img.shields.io/badge/data-CC%20BY--SA%204.0-orange.svg)](DATA_LICENSE.txt)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.1-purple.svg)](CODE_OF_CONDUCT.md)

**Arthaive** — India's open startup funding intelligence platform. A free, structured, source-backed platform tracking startup funding across India. Built as an open alternative to paid platforms like Tracxn and Crunchbase — focused entirely on India, with every record verified and linked to its original source.

> *Artha* (अर्थ — wealth, capital) + *hive* (the collective intelligence). A living, source-backed hive of India's funding data.

**Live:** [arthaive.kunthive.in](https://arthaive.kunthive.in)
**Repo:** [github.com/kunthive-Labs/Arthaive](https://github.com/kunthive-Labs/Arthaive)

---

## Features

- **13,700+ verified funding records** spanning 2015–2026
- **Explore & filter** deals by sector, stage, city, amount range, and date
- **Analytics dashboard** — funding trends, sector breakdowns, stage funnels, investor leaderboards, India choropleth map
- **Investor profiles** — deal history, sectors covered, co-investor network
- **Sector deep-dives** — per-sector funding timeline and top deals
- **Weekly & monthly reports** with AI-written trend summaries
- **Natural-language search** — ask plain-English questions, get verified deal results
- **Live feed** — real-time updates via Supabase Realtime
- **Admin panel** — review queue, entity manager, source manager, pipeline logs, bulk CSV import, AI usage monitoring
- **Public REST API v1** — versioned endpoints, API keys, rate limits, full docs at `/api-docs`
- **User features** — bookmarks, watchlist, saved searches, deal alerts (auth via Supabase)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (SSR) |
| Charts | Recharts |
| AI | Anthropic Claude (Sonnet for prose, Haiku for parsing) |
| Pipeline | Python (RSS discovery → rule-based + Claude extraction → entity resolution) |
| Tests | Vitest |
| Deployment | Vercel |
| Error tracking | Sentry-compatible shim (`lib/sentry.ts`) |

---

## Local Development

**Prerequisites:** Node.js 18+, a Supabase project (optional — falls back to static data), an Anthropic API key (optional — AI features degrade gracefully when unset).

```bash
# 1. Clone and install
git clone https://github.com/kunthive-Labs/Arthaive.git
cd Arthaive
npm install

# 2. Set environment variables — see "Environment variables" below
cp .env.example .env.local   # if you have one, otherwise create from scratch

# 3. Run migrations in Supabase SQL editor (in order)
# supabase/migrations/001_initial_schema.sql … 018_performance_indexes.sql

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

```env
# Supabase (optional — if unset, the app uses the static fundingData fixture)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin gate
ADMIN_EMAILS=you@example.com,colleague@example.com

# AI features (Phase 7)
ANTHROPIC_API_KEY=

# Public site URL — used in sitemap.xml
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## Admin Panel

The admin panel lives at `/admin`. Access is restricted to emails listed in `ADMIN_EMAILS`.

**Admin features:**
- **Review queue** — approve, reject, or flag extracted funding records
- **Entity manager** — manage startup and investor canonical names + aliases
- **Source manager** — add article sources, set reliability tiers
- **Pipeline logs** — view automated pipeline run history
- **Bulk import** — upload a CSV to queue multiple records at once
- **Export** — download all verified deals as CSV or JSON
- **AI usage** — 30-day spend by use case, budget vs. actual

---

## Data Pipeline

The `pipeline/` directory contains a Python pipeline that:

1. **Discovery** (`pipeline/discovery.py`, `fetcher.py`, `wayback.py`) — polls Entrackr, Inc42, and YourStory feeds twice daily, with Wayback Machine fallback for dead links.
2. **Extraction** (`pipeline/extractor.py`) — rule-based first pass, Claude Haiku fallback for low-confidence cases.
3. **Currency normalisation** (`pipeline/currency.py`) — USD/INR conversion → INR lakhs canonical.
4. **Entity resolution** (`pipeline/entity_resolver.py`) — rapidfuzz-based fuzzy matching + alias system to dedup company/investor names.
5. **Dedup** (`pipeline/dedup.py`) — same-company / same-week / similar-amount deal collapsing.
6. **Queue + auto-approval** (`pipeline/queue.py`, `pipeline/run.py`) — auto-approves at confidence ≥ 0.8; lower-confidence rows go to the admin review queue.

```bash
cd pipeline
pip install -r requirements.txt
python run.py
```

---

## Public API

A read-only REST API for developers and researchers.

- Docs: [`/api-docs`](https://arthaive.kunthive.in/api-docs)
- Get a free key: [`/api-keys`](https://arthaive.kunthive.in/api-keys)
- Rate limits: 30/min anonymous · 120/min with a key
- Auth: `X-API-Key` header

Quick example:

```bash
curl 'https://arthaive.kunthive.in/api/v1/funding-rounds?sector=Fintech&stage=series_a&limit=5' \
  -H 'X-API-Key: ifk_your_key_here'
```

### v1 endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/startups` | List startups (one row per company, latest round) |
| GET | `/api/v1/startups/:id` | Full funding history for a company or deal id |
| GET | `/api/v1/funding-rounds` | Paginated funding rounds |
| GET | `/api/v1/investors/:id` | Investor profile + deal history |
| GET | `/api/v1/trends/monthly` | Monthly deal count + funding totals |
| GET | `/api/v1/trends/sectors` | Sector-level aggregates |
| GET | `/api/v1/search?q=...` | Keyword search |

---

## Testing

```bash
npm test           # one-shot vitest run
npm run test:watch # watch mode
```

The API tests in `tests/api/v1.test.ts` call route handlers directly, without spinning up a server. Without Supabase env vars set, they run against the static `data/funding-data.ts` fixture — deterministic by design.

---

## Production checklist

```bash
npx tsc --noEmit   # zero TypeScript errors
npm run build      # clean build
npm test           # all green
```

Then deploy to Vercel and submit `/sitemap.xml` to Google Search Console.

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Frontend, static data, auth |
| 1 | ✅ Done | Supabase live DB |
| 2 | ✅ Done | Admin interface |
| 3 | ✅ Done | Discovery pipeline (RSS poller) |
| 4 | ✅ Done | Extraction pipeline (rule-based + AI) |
| 5 | ✅ Done | Entity resolution + alias system |
| 6 | ✅ Done | Analytics & weekly/monthly reports |
| 7 | ✅ Done | AI layer (trend summaries, NL search, sector classifier) |
| 8 | ✅ Done | Public API v1 |
| 9 | ✅ Done | Polish, performance indexes, SEO, README |

See `PHASES.md` for the full per-phase build log.

---

## Documentation

The [`documentation/`](documentation/) folder is the full guide — read it in order:

| # | File | Covers |
|---|---|---|
| 1 | [01-overview.md](documentation/01-overview.md) | Product, mission, design principles |
| 2 | [02-architecture.md](documentation/02-architecture.md) | The four layers and request flow |
| 3 | [03-data-model.md](documentation/03-data-model.md) | Every table, field by field |
| 4 | [04-pipeline.md](documentation/04-pipeline.md) | The Python crawl → extract → write pipeline |
| 5 | [05-admin.md](documentation/05-admin.md) | The admin console |
| 6 | [06-entity-resolution.md](documentation/06-entity-resolution.md) | Canonical names + alias system |
| 7 | [07-frontend.md](documentation/07-frontend.md) | Every page and its data source |
| 8 | [08-getting-started.md](documentation/08-getting-started.md) | Running the full stack locally |
| 9 | [09-roadmap.md](documentation/09-roadmap.md) | Built / partial / ahead |
| 10 | [10-glossary.md](documentation/10-glossary.md) | Domain terms |

Top-level references: [`PROJECT_REFERENCE.md`](PROJECT_REFERENCE.md) (product spec), [`PHASES.md`](PHASES.md) (build log), [`DEPLOYMENT.md`](DEPLOYMENT.md) (hosting), [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Contributing

Data corrections, source suggestions, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue to discuss before large changes.

---

## License

Arthaive is dual-licensed to keep both the software **and** the data open:

- **Code** — [GNU AGPL-3.0](LICENSE). You're free to use, modify, and self-host it; if you run a modified version as a network service, you must release your changes under the same license. This keeps the platform open and prevents closed-source forks.
- **Data** — the funding dataset (`funding_data/`, `data/`, and records served by the API) is licensed [CC BY-SA 4.0](DATA_LICENSE.txt). Reuse it freely with attribution to Arthaive; derivative datasets must stay under the same license.

Each funding record links to its original source; those sources retain their own rights. See [`DATA_LICENSE.txt`](DATA_LICENSE.txt) for the data terms and attribution requirements.
