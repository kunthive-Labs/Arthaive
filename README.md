# India Startup Funding Intelligence Platform

A free, structured, source-backed intelligence platform tracking startup funding across India. Built as an open alternative to paid platforms like Tracxn and Crunchbase — focused entirely on India, with every record verified and linked to its original source.

**Live:** [ind-startup-funding.vercel.app](https://ind-startup-funding.vercel.app)

---

## Features

- **1,695+ verified funding records** from Q1 FY2024 onwards
- **Explore & filter** deals by sector, stage, city, amount range, and date
- **Analytics dashboard** — funding trends, sector breakdowns, stage funnels, investor leaderboards, India choropleth map
- **Investor profiles** — deal history, sectors covered, co-investor network
- **Sector deep-dives** — per-sector funding timeline and top deals
- **Live feed** — real-time updates via Supabase Realtime
- **Admin panel** — review queue, entity manager, source manager, pipeline logs, bulk CSV import, data export
- **User features** — bookmarks, watchlist, saved searches, deal alerts (auth via Supabase)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (SSR) |
| Charts | Recharts |
| Deployment | Vercel |
| Error tracking | Sentry |

---

## Local Development

**Prerequisites:** Node.js 18+, a Supabase project

```bash
# 1. Clone and install
git clone https://github.com/8harath/Ind-Startup-Funding.git
cd Ind-Startup-Funding
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Run migrations in Supabase SQL editor (in order)
# supabase/migrations/001_initial_schema.sql → 015_new_tables_rls.sql

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Admin Panel

The admin panel lives at `/admin`. Access is restricted to emails listed in the `ADMIN_EMAILS` environment variable.

```env
ADMIN_EMAILS=you@example.com,colleague@example.com
```

**Admin features:**
- **Review queue** — approve, reject, or flag extracted funding records
- **Entity manager** — manage startup and investor canonical names + aliases
- **Source manager** — add article sources, set reliability tiers
- **Pipeline logs** — view automated pipeline run history
- **Bulk import** — upload a CSV to queue multiple records at once
- **Export** — download all verified deals as CSV or JSON

---

## Data Pipeline (Phase 3+)

The `pipeline/` directory (coming in Phase 3) contains a Python RSS poller that:
1. Polls Entrackr, Inc42, and YourStory feeds twice daily
2. Filters articles by funding keywords
3. Extracts structured fields (rule-based + Claude AI fallback)
4. Queues records for admin review with confidence scores

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Frontend, static data, auth |
| 1 | ✅ Done | Supabase live DB |
| 2 | ✅ Done | Admin interface |
| 3 | 🔲 Next | Discovery pipeline (RSS poller) |
| 4 | 🔲 | Extraction pipeline (rule-based + AI) |
| 5 | 🔲 | Entity resolution + alias system |
| 6 | 🔲 | Analytics & weekly reports |
| 7 | 🔲 | AI layer (trend summaries, NL search) |
| 8 | 🔲 | Public API v1 |
| 9 | 🔲 | Polish & launch |

---

## Contributing

Data corrections, source suggestions, and pull requests are welcome. Open an issue to discuss before large changes.

---

## License

MIT
