# Pipeline — Historical Ingestion POC

CLI tool that crawls a news outlet's sitemap, fetches articles (with Wayback Machine fallback for dead URLs), extracts funding-deal data via Claude Haiku, and writes candidates into the `review_queue` table for admin verification.

## Status

POC scope — one source (**Entrackr**), AI-only extraction, manual CLI invocation. See `/Users/bharath.bhaktha/.claude/plans/lets-proceed-with-implementation-compressed-hellman.md` for the full plan and what's deliberately out of scope.

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
| `ANTHROPIC_API_KEY` | Required for extraction |

## Usage

```bash
# 1. Dry run: discover + fetch 20 recent URLs, print JSON to stdout, NO DB writes, NO AI calls
python -m pipeline.run --source entrackr --since 2026-04-01 --limit 20 --dry-run

# 2. Discover + fetch + write to sources only (skip AI extraction)
python -m pipeline.run --source entrackr --since 2026-04-01 --limit 20 --no-ai

# 3. Full run, small batch
python -m pipeline.run --source entrackr --since 2026-04-01 --limit 20

# 4. Full historical (~3-6k articles, ~$10-20 in Haiku calls)
python -m pipeline.run --source entrackr --since 2016-01-01
```

## What ends up where

| Table | Row per | Key fields written |
|---|---|---|
| `sources` | article | `url` (unique), `title`, `publication_date`, `publisher`, `reliability_tier='tier_1'`, `extraction_method='ai_extracted'`, `raw_text_snapshot` (≤5000 chars) |
| `review_queue` | extracted deal candidate | `source_id`, `raw_extracted_data` (full AI JSON), `suggested_company`, `match_confidence`, `status='pending'` |
| `pipeline_jobs` | one per run | counters + `run_status` + `error_log` |

Articles where the AI says "not a funding event" → `sources` row written, **no `review_queue` row**. The article is recorded so we don't re-process it.

## Caching

AI responses are cached in `pipeline/.extractor_cache.sqlite` keyed by `(url + body)`. Re-running the same window is free.

## Pipeline architecture

```
sitemap_index.xml ──► daily sitemap(s) ──► slug filter ──► fetch (live → wayback fallback)
                                                                       │
                                                                       ▼
                                                          Claude Haiku JSON extract
                                                                       │
                                                  ┌────────────────────┼────────────────────┐
                                                  ▼                    ▼                    ▼
                                              sources            review_queue          pipeline_jobs
```

## Troubleshooting

- **`Missing Supabase env vars`** — `.env.local` not loaded. Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set there.
- **Most articles return `is_funding_event=false`** — expected. Slug pre-filter is permissive; the AI is the real gate. Snippets/funding pages on Entrackr also include earnings, hires, and regulatory news.
- **`fetch.miss` log spam** — URL 404s on live site and Wayback. Old Entrackr URLs (pre-2018) sometimes have neither. Acceptable; just not recoverable.
- **JSON parse failures** — re-run; the extractor retries once internally. Persistent failures land in the cache as `{"_parse_failure": true}` and don't get re-tried.
- **Rate limits** — current code is single-threaded sequential. If you hit Entrackr rate limits, increase the sleep between requests in `fetcher.py`.

## Cost estimate

Haiku at ~$1/M input + $5/M output tokens. Each article ≈ 5KB body → ~1.5k input + ~300 output tokens → ~$0.0035/article.

- 100 articles → ~$0.35
- 1,000 articles → ~$3.50
- 5,000 articles (10y of Entrackr funding coverage) → **~$18**

## What this does NOT do (yet)

- No rule-based extractor (Phase 4 spec)
- No entity resolution / alias matching (Phase 5)
- No Inc42, YourStory, ET Tech (add config entries when ready)
- No cron / scheduled runs
- No bulk-approve in admin UI — reviewing 2-4k items one-by-one will be painful
