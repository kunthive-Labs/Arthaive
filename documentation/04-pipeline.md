# 04 — Data collection pipeline

This is the most important chapter to understand. The pipeline is how raw news articles become structured rows in the `deals` table.

## At a glance

```
                                    ┌─────────────────┐
   1. Discovery   ─── walks ───►    │  Source sitemap │
                                    │  (Entrackr…)    │
                                    └────────┬────────┘
                                             │ URLs
                                             ▼
   2. URL dedup   ─── checks ──►   sources.url uniqueness
                                             │
                                             ▼ new URLs only
   3. Fetch       ─── downloads + body extract; Wayback fallback
                                             │
                                             ▼ {url, title, body, pub_date}
   4. AI extract  ─── Claude Haiku → strict JSON deal schema
                                             │
                                             ▼ {company, amount, stage, investors, …}
   5. Currency    ─── INR / USD normalization
                                             │
                                             ▼
   6. Entity      ─── company name → canonical
       resolve         investor names → canonical
                                             │
                                             ▼
   7. Deal dedup  ─── same company + ±10% amount + ±30 days?
                                             │
                                             ▼
   8. Route       ─── if confidence ≥ 0.80 and no duplicate ─► deals
                      else ─────────────────────────────────► review_queue
                                             │
                                             ▼
   9. Log         ─── one row to pipeline_jobs with counts
```

## How you run it

```bash
# From the repo root, with the Python venv active and env vars loaded
python -m pipeline.run --source entrackr --since 2026-05-01

# Useful flags
--dry-run         # Walk + fetch, no DB writes, no AI calls
--no-ai           # Discover + fetch + record to sources, but skip extraction
--limit 50        # Cap candidate URLs (good for testing)
--progress-every 10
```

For local setup, see [08-getting-started.md](08-getting-started.md).

## Step by step

### 1. Discovery — `pipeline/discovery.py`

Reads the source's sitemap index (`config.SOURCES['entrackr']['sitemap_index_url']`), finds daily sitemaps that match `sitemap_YYYY-MM-DD.xml`, pulls every URL from sitemaps whose date is ≥ `--since`. Yields `Candidate(url, lastmod)` tuples.

URLs go through a coarse keyword filter (`FUNDING_SLUG_HINTS`, `FUNDING_SLUG_EXCLUDE` in `config.py`) — slugs like `raises`, `secures`, `series` are likely funding stories; slugs under `/fintrackr/` (earnings) are skipped. This is a pre-filter, not the real gate; the AI extractor is the real gate.

### 2. URL-level dedup — `pipeline/dedup.py:is_url_seen`

Before fetching, checks if the URL already exists in `sources`. If yes, skip. This is how repeated runs are safe and additive (P4).

### 3. Fetch — `pipeline/fetcher.py`

Downloads with httpx (timeout 20s, project user-agent). Tries the source's CSS selectors in order (`article`, `[itemprop='articleBody']`, `.article-content`, `.post-content`, `main`) to extract the body. Captures `<title>` and the article's publication date.

If the fetch fails (dead link, 4xx, 5xx), `pipeline/wayback.py` queries `archive.org/wayback/available` and tries the snapshot. Either way we end up with an `Article(url, title, body_text, publication_date, fetched_via)` dataclass.

Body is truncated to `MAX_BODY_CHARS = 5000` before extraction — this keeps Claude token costs predictable.

### 4. AI extraction — `pipeline/extractor.py`

Claude Haiku is asked to return strict JSON matching the schema documented at the top of `extractor.py`:

```json
{
  "is_funding_event": true,
  "company": "Razorpay",
  "amount_raw": "$50 million",
  "amount_value": 50000000,
  "amount_currency": "USD",
  "stage": "Series F",
  "sectors": ["fintech"],
  "investors": ["Tiger Global", "Sequoia Capital India"],
  "lead_investor": "Tiger Global",
  "deal_date": "2026-03-15",
  "location": "Bangalore",
  "notes": null,
  "confidence": 0.95
}
```

Key behaviors:

- **Strict event check.** If the article is not a funding announcement (it is earnings, layoffs, a hire, a regulatory filing), the model returns `is_funding_event=false` and we drop it.
- **Self-rated confidence.** The model rates its own confidence 0–1. We trust this rating to drive auto-approval.
- **On-disk cache.** Every response is keyed by `sha256(url + body)` in `pipeline/.extractor_cache.sqlite`. Re-runs do not re-pay the API. The cache file is git-ignored.
- **Retry on bad JSON.** If the response is unparseable, we retry once. If that still fails, the article is dropped and a `_parse_failure` row is cached so we do not retry forever.

### 5. Currency normalization — `pipeline/currency.py`

Converts `amount_value` + `amount_currency` to `(amount_inr, amount_usd)` at the hardcoded rate `USD_INR_RATE = 83.5`. INR-denominated amounts get a USD value derived, and vice versa. Missing or unknown currency → `(0, 0)`.

Why hardcoded: a fixed rate is good enough for charts and listings at the round level. When we add historical rates (Phase 4.6), this is the only file that changes.

### 6. Entity resolution — `pipeline/entity_resolver.py`

The company name and every investor name go through `resolve(name, "startup"|"investor")`:

1. **Exact alias hit** in `startup_aliases` / `investor_aliases` → return canonical.
2. **Exact canonical hit** (the name already is canonical) → return it.
3. **Fuzzy match** with `rapidfuzz.token_sort_ratio` against all canonical names plus aliases:
   - Score ≥ 92 → return canonical (auto)
   - Score 75–91 → return as `suggested` (admin must confirm)
   - Score < 75 → likely a new entity, no match

The candidate list is cached in-process so we do not pull all aliases from Supabase every record. Call `clear_index_cache()` between long-running test scenarios.

See [06-entity-resolution.md](06-entity-resolution.md) for the deeper why.

### 7. Deal-level dedup — `pipeline/dedup.py:find_duplicate_deal`

After we have a canonical company name, an amount in INR, and a date, we check the `deals` table:

```
same company AND
deal_date within ±30 days AND
amount_inr within ±10%
```

If a match exists, the new record is treated as a duplicate (probably the same round announced by a second publisher) and routed to review with a `duplicate_of` hint. The admin can mark it `merged`, or override and approve as a separate deal.

### 8. Routing — `pipeline/run.py:_route_record`

The decision logic:

```
auto-approve if ALL of:
  confidence ≥ 0.80
  canonical company exists (resolver hit ≥ 92)
  deal_date is non-null
  amount_inr > 0
  no duplicate found
```

Auto-approve writes a row into `deals` with `record_status='verified'` via `queue.insert_deal()`. The row is immediately visible on the public site.

Everything else goes to `review_queue` via `queue.insert_review_item()`. The raw extractor output is preserved in `raw_extracted_data`, the resolver's `suggested_company` is set, and any `duplicate_of` hint is attached as a note.

### 9. Job log — `pipeline_jobs`

At the end of every run, `queue.log_job_run()` writes a single row with:

- Source feed name
- Counts (fetched, filtered, extracted, auto-approved, flagged, errors)
- Run status (success / partial / failed)
- Error log (truncated to 8000 chars)

This is what the admin "Pipeline" tab reads from.

## Failure modes and how we handle them

| What can go wrong | What happens |
|---|---|
| Source publishes 0 articles today | Empty run, `pipeline_jobs` row with all zeros. |
| Article URL is dead | Wayback Machine fallback tries an archive snapshot. |
| Claude returns invalid JSON | Retry once; if still bad, drop the article and cache the failure. |
| Anthropic API rate-limit / timeout | The exception bubbles up to the per-URL `try/except`. The URL is logged as an error, the run continues. |
| Supabase write fails | Same — per-URL try/except, error logged, run continues. Run finishes with status `partial`. |
| The same article gets re-discovered tomorrow | URL-dedup skips it. |
| Two publishers cover the same round | URL-dedup is unique per article; deal-dedup catches it at step 7 and routes to review. |

## What this pipeline does not do (yet)

- **No real-time / push.** It is a polling crawler. The `/live` feed on the frontend uses Supabase realtime to show new rows; the pipeline itself is batch.
- **No multi-source ingest yet.** Only Entrackr is wired (`config.SOURCES['entrackr']`). Adding Inc42 and YourStory means adding their sitemap config and selectors — see [09-roadmap.md](09-roadmap.md).
- **No cross-source merging.** If Entrackr and Inc42 both report the same round, two `sources` rows exist. The dedup logic in step 7 collapses the deal but the source rows remain — by design, so we can show "covered by N publishers" later.
- **No retry queue.** A failed AI call is logged and the URL is left as "URL-seen so we don't retry" only if the source row was inserted. If the failure happened before that, the URL gets retried on the next run, which is fine.
