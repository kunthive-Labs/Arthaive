# 08 — Getting started locally

Run the whole stack on your laptop in about 15 minutes. This guide assumes macOS or Linux; Windows works under WSL.

## Prerequisites

- Node.js 20+ (`node -v`)
- Python 3.10+ (`python3 -V`)
- A Supabase project (free tier is fine — https://supabase.com)
- An Anthropic API key (https://console.anthropic.com) — needed for the pipeline; the frontend works without it

## 1. Clone and install

```bash
git clone git@github.com:kunthive-Labs/Arthaive.git
cd Arthaive

# Frontend deps
npm install

# Pipeline deps (in a virtualenv)
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
```

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```bash
# From your Supabase project: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…       # the anon (public) key
SUPABASE_SERVICE_ROLE_KEY=eyJ…           # the service role key — pipeline only, never in client code

# Your email for admin access
ADMIN_EMAILS=you@example.com

# Required for pipeline AI extraction
ANTHROPIC_API_KEY=sk-ant-…

# Local dev URL — leave as the default unless you change ports
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — only if you want submission notification emails
RESEND_API_KEY=…
ADMIN_EMAIL=you@example.com
```

The pipeline reads `.env.local` first, then `.env` as a fallback. The Next.js dev server reads `.env.local` automatically.

## 3. Set up the database

In the Supabase SQL editor, run the migrations in order:

```bash
# In your Supabase project: SQL Editor → "+ New query" → paste each file, run, repeat
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_indexes.sql
supabase/migrations/003_rls_policies.sql
supabase/migrations/004_functions.sql
supabase/migrations/005_views.sql
supabase/migrations/006_user_profiles.sql
supabase/migrations/007_user_features.sql
supabase/migrations/008_alerts.sql
supabase/migrations/009_notification_preferences.sql
supabase/migrations/010_sources_table.sql
supabase/migrations/011_startup_aliases.sql
supabase/migrations/012_review_queue.sql
supabase/migrations/013_pipeline_jobs.sql
supabase/migrations/014_deals_columns.sql
supabase/migrations/015_new_tables_rls.sql
```

Then seed the alias data:

```bash
supabase/seed_aliases.sql
```

If you want the sector taxonomy seeded too, run `supabase/seed.sql`.

> Tip: once you are comfortable with the Supabase CLI, you can run all of these in one shot with `supabase db push`. The manual SQL-editor route is documented because it works out of the box without extra tooling.

## 4. Run the frontend

```bash
npm run dev
```

Open http://localhost:3000.

You should see the home page. With an empty or unconfigured Supabase, public data surfaces fall back to `data/funding-data.ts` (13,700+ generated deals). Auth-gated features still require Supabase credentials.

## 5. Run the pipeline

Try a dry run first — no DB writes, no AI calls:

```bash
python -m pipeline.run --source entrackr --since 2026-05-01 --dry-run --limit 5
```

You should see five article URLs walked, fetched, and printed as JSON to stdout.

Now do a real run:

```bash
python -m pipeline.run --source entrackr --since 2026-05-20 --limit 10
```

This will:
- Walk Entrackr's sitemap from 2026-05-20 forward
- Fetch up to 10 candidate articles
- Call Claude Haiku to extract structured deal data
- Write to `sources`, then either `deals` (auto-approved) or `review_queue`
- Append one row to `pipeline_jobs`

Check the run in Supabase: open the `sources`, `review_queue`, and `pipeline_jobs` tables.

## 6. Access the admin console

1. Sign up at http://localhost:3000/login with the email in your `ADMIN_EMAILS`.
2. Go to http://localhost:3000/admin.

You should see the dashboard. The "Review" tab will show whatever the pipeline pushed to `review_queue`.

## Useful commands

```bash
# Frontend
npm run dev              # dev server on :3000
npm run build            # production build
npm run start            # serve the production build
npm run lint             # eslint

# Pipeline
python -m pipeline.run --dry-run --since 2026-05-01            # no writes, no AI
python -m pipeline.run --no-ai --since 2026-05-01              # write sources only
python -m pipeline.run --source entrackr --since 2026-05-01    # full run

# Useful flags
--limit N                # cap candidate URLs
--progress-every N       # log progress every N records
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend loads but shows zero deals | Supabase is configured but tables are empty | Either run the pipeline, or unset `NEXT_PUBLIC_SUPABASE_URL` to use the static fallback |
| Pipeline says "Missing Supabase env vars" | `.env.local` not in repo root, or service role key not set | Confirm both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present |
| Pipeline says "Unauthorized" from Anthropic | `ANTHROPIC_API_KEY` missing or wrong | Check your key at console.anthropic.com |
| Admin page returns 404 | Your email is not in `ADMIN_EMAILS`, or you are signed out | Update env, restart dev server, sign in again |
| TypeScript errors on build | Stale `.next` cache | `rm -rf .next && npm run build` |
| Pipeline keeps re-extracting the same article | The SQLite cache is in `pipeline/.extractor_cache.sqlite` — check it exists and is not 0 bytes | Delete it to force fresh extractions; it auto-recreates |
