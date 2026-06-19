# Pipeline — Funding-News Ingestion

Python pipeline that discovers Indian startup funding news (RSS twice daily + historical sitemap backfill), extracts structured deal data (rule-based first, Claude Haiku fallback), resolves entities against the alias tables, dedups, and auto-approves high-confidence records into `deals` — everything else lands in `review_queue` for admin verification.

Implements Phases 3 (Discovery), 4 (Extraction), and 5 (Entity Resolution) of `PHASES.md`.

## Setup

```bash
# From repo root
python3 -m venv pipeline/.venv
source pipeline/.venv/bin/activate
pip install -r pipeline/requirements.txt
```

Required env vars (read from `.env.local` or `.env` at repo root):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — bypasses RLS so the pipeline can write to `review_queue` |
| `ANTHROPIC_API_KEY` | Required for the AI fallback extractor (skip with `--no-ai`) |

## Usage

```bash
# Default: RSS discovery + extraction in one run (what the cron job does)
python -m pipeline.run

# Discovery only: poll RSS feeds, keyword-filter, fetch articles,
# store sources + pending review_queue rows (raw_extracted_data = {})
python -m pipeline.run --discover

# Extraction only: process all pending queue items with empty raw_extracted_data.
# Rule-based extraction first; Claude Haiku fallback when confidence < 0.70.
# Confidence >= 0.80 (+ resolved company, date, amount, no duplicate) auto-approves into deals.
python -m pipeline.run --extract

# Dry run of discovery: print fetched articles as JSON, no DB writes, no AI
python -m pipeline.run --discover --dry-run --limit 5

# Historical sitemap backfill (inline extraction, original POC flow)
python -m pipeline.run --backfill --source entrackr --since 2016-01-01
python -m pipeline.run --source inc42 --since 2026-04-01 --limit 20   # --since implies --backfill

# Skip the AI fallback (rule-based only)
python -m pipeline.run --extract --no-ai
```

## Scheduled runs

`.github/workflows/pipeline.yml` runs `python -m pipeline.run` at 02:00 and 14:00 UTC (7:30 AM / 7:30 PM IST). Set repo secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. Manual trigger via *Run workflow*.

## Module map

| Module | Role |
|---|---|
| `config.py` | `RSS_FEEDS`, `KEYWORDS`, `SOURCES` registry (sitemap config + body selectors), tunables |
| `discovery.py` | RSS polling (`poll_feeds`, `keyword_filter`) + sitemap walker (`discover_urls`) |
| `fetcher.py` | Article download + body extraction, Wayback Machine fallback for dead URLs |
| `rule_extractor.py` | Regex/keyword extraction: amount, round type, company, investors, location, sectors |
| `confidence.py` | Weighted field-confidence scoring (source tier 0.25, amount 0.20, company 0.20, …) |
| `extractor.py` | Claude Haiku AI extractor with SQLite response cache (fallback when rules < 0.70) |
| `entity_resolver.py` | Exact + fuzzy (rapidfuzz) alias resolution with contextual boosting (city/sector/amount) |
| `currency.py` | INR/USD normalization |
| `dedup.py` | URL-level and deal-level (company + date window + amount tolerance) dedup |
| `queue.py` | Supabase writes: `sources`, `review_queue`, `deals`, `pipeline_jobs` |
| `run.py` | Orchestrator + CLI |

## What ends up where

| Table | Row per | Key fields written |
|---|---|---|
| `sources` | article | `url` (unique), `title`, `publication_date`, `publisher`, `reliability_tier`, `extraction_method` (`rss_auto` / `ai_extracted`), `raw_text_snapshot` (≤5000 chars) |
| `review_queue` | deal candidate | `source_id`, `raw_extracted_data`, `suggested_company`, `match_confidence`, `status` |
| `deals` | auto-approved record | full deal row, `record_status='verified'`, `source_id` |
| `pipeline_jobs` | one per run | counters + `run_status` + `error_log` |

Queue item lifecycle after `--extract`:
- **auto-approved** → row inserted into `deals`, queue status `approved` (notes: "Auto-approved")
- **possible duplicate** → status `needs_more_info` with the existing deal id in notes
- **AI says not a funding event** → status `rejected`
- **anything else** → stays `pending` with populated `raw_extracted_data` for human review in `/admin/review`

## Extraction routing

```
article body ──► rule_extractor (regex/keyword) ──► confidence.py weighted score
                       │
                       ├── confidence >= 0.70 and is_funding_event ──► use rule result
                       └── otherwise ──► Claude Haiku (extractor.py, cached)
                                              │
                                              └── is_funding_event=false ──► reject

extracted record ──► entity_resolver (exact → fuzzy ≥92 auto / 75–91 suggest, ctx boost)
                ──► currency normalize ──► dedup ──► auto-approve (>= 0.80) or review queue
```

## Entity resolution

- Exact match against `startup_aliases` / `investor_aliases` (canonical or alias column).
- Fuzzy: rapidfuzz `token_sort_ratio` over all canonical names + aliases + existing `deals.company` / `investors.name`. ≥92 auto-canonicalizes; 75–91 attaches `suggested_company` for review.
- Contextual boost (below threshold only): +5 city match, +5 sector overlap, +3 amount within 0.1–10× of the entity's median for the stage.
- On admin approval, if the extracted name differs from the approved canonical name, the extracted name is auto-inserted into `startup_aliases` (`app/api/admin/review/[id]/route.ts`).
- Seed aliases: `supabase/seed_aliases.sql`.

## Caching

AI responses are cached in `pipeline/.extractor_cache.sqlite` keyed by `(url + body)`. Re-running the same window is free.

## Troubleshooting

- **`Missing Supabase env vars`** — `.env.local` not loaded. Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set there.
- **A feed returns nothing** — feeds fail independently and are logged to stderr (`rss.feed_error`); the run continues. Entrackr's live feed is `/rss`, not `/feed`.
- **Most articles rejected as non-funding** — expected; the keyword pre-filter is permissive and the extractors are the real gate.
- **`fetch.miss` log spam** — URL 404s on live site and Wayback. Old URLs (pre-2018) sometimes have neither. Acceptable.
- **JSON parse failures** — the AI extractor retries once; persistent failures are cached as `{"_parse_failure": true}` and skipped.
- **Rate limits** — single-threaded sequential. Use `--limit` to batch large backfills.

## Cost estimate

The AI is only called when rule-based confidence < 0.70, so cost depends on how messy the articles are. Worst case (all AI, Haiku ~$1/M in + $5/M out): ~$0.0035/article → 1,000 articles ≈ $3.50, 5,000 ≈ $18. Rule-based handles clean wire-style announcements for free.

## Not yet done

- No bulk-approve in admin UI — reviewing thousands of items one-by-one is painful
- YourStory/ET Tech sitemap backfill configs (RSS only for YourStory)
- Historical FX rates (flat 83.5 INR/USD in `currency.py`)
