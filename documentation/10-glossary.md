# 10 — Glossary

Domain terms used across the codebase and these docs.

## Funding terms

**Stage / Round type.** The label for where a funding round sits in a company's life. Standard ladder: Pre-Seed → Seed → Pre-Series A → Series A → Series B → Series C → … Plus Bridge (an interim raise between named rounds), Debt (loan rather than equity), and Acquisition (when one company buys another).

**Lead investor.** The investor who typically negotiates valuation, takes the largest cheque, and sets terms for the round. One per round (usually). Other investors in the same round are "participating".

**Undisclosed amount.** Some rounds are announced without a public figure. We store these with `amount_inr=0` and surface them on the UI as "Undisclosed". The pipeline does not auto-approve these — they go to review.

**Dry powder.** A fund's uninvested capital. We do not track this today.

**Valuation.** What the company is worth at the round close. We store deal amount, not valuation. (Future field.)

## Database / schema terms

**Canonical name.** The single authoritative name for an entity. "Peak XV Partners" is canonical; "Sequoia India" is an alias of it. Resolved by the entity resolver before write.

**Alias.** A name variant that maps to a canonical name. Stored in `startup_aliases` or `investor_aliases`.

**Record status.** A column on the `deals` table that gates public visibility. Values:
- `verified` — public; appears in search, charts, analytics
- `needs_review` — extracted but admin has not confirmed
- `rejected` — explicitly rejected; not public
- `merged` — superseded by another deal record

The public site filters on `record_status='verified'`.

**Source.** A row in the `sources` table. One per unique URL. Every deal links to at least one source (`P1: source-backed data`).

**Reliability tier.** A 3-level classification of source publishers:
- `tier_1` — direct verified reporting (Entrackr, Inc42)
- `tier_2` — reliable but often rehashed (general business press)
- `tier_3` — discovery hints only (aggregators, social posts)

**Sector.** A tag like "fintech", "edtech", "healthtech". Stored as an array on `deals.sectors`. Seeded from a fixed taxonomy in `supabase/seed.sql`.

## Pipeline terms

**Discovery.** The step where we walk a source's sitemap or RSS feed to find candidate article URLs.

**Fetch.** Downloading an article and extracting its body text.

**Wayback fallback.** When a live article URL is dead, we try archive.org's Wayback Machine for a snapshot.

**Extraction.** Turning the article body into a structured JSON deal record. Done by Claude Haiku (`pipeline/extractor.py`).

**Confidence.** A number 0-1 that Claude rates itself with on each extraction. Drives auto-approval. Distinct from the entity resolver's match confidence (which is a percentage 0-100).

**Auto-approval threshold.** `confidence ≥ 0.80` plus three guards (canonical company exists, deal_date is non-null, amount_inr > 0, no duplicate). Rows that pass go straight into `deals`; everything else goes to the review queue.

**Match confidence (entity resolver).** The 0-100 score from rapidfuzz's `token_sort_ratio`. Thresholds:
- ≥ 92: auto-canonicalize
- 75 – 91: suggest, route to review
- < 75: treat as new entity

**Deal-level dedup.** Checking whether a newly extracted deal looks like an existing one (same company, ±10% amount, ±30 days). Distinct from URL-level dedup, which checks `sources.url` uniqueness.

**URL-level dedup.** Skipping an article if we already have its URL in `sources`. This is how the pipeline is safely re-runnable.

**Extraction cache.** `pipeline/.extractor_cache.sqlite` — a local SQLite that stores every Claude response keyed by `sha256(url + body)`. Re-runs hit the cache, not the API.

## Review queue terms

**Pending.** Just extracted by the pipeline, waiting for admin attention.

**Approved.** Admin confirmed; a new row exists in `deals`. The review_queue row stays for audit.

**Rejected.** Admin decided this is not a real funding event (e.g. the article is a rumour, or the AI misread it).

**Merged.** This record is a duplicate of an existing deal. The existing deal lives on; the new source URL may be appended to it.

**Needs more info.** Admin punted on this for now — comes back later, maybe checks another source.

## Frontend terms

**Coverage notice.** The disclaimer on the analytics page telling users what date range and dataset the charts cover (`P8: honest data labeling`).

**Live feed.** The `/live` page subscribing to Supabase realtime — new verified deals appear without a page refresh.

**Bookmark.** A user saving a deal for later. Stored in the `bookmarks` table.

**Watchlist.** A user tracking a specific company or sector. Stored in the `watchlists` table.

**Saved search.** A query (filters + keyword) a user saved to re-run easily. Stored in `saved_searches`.

**Alert.** A saved search that emails the user when new matching deals arrive. Stored in `alerts`.

## Acronyms

| Acronym | Meaning |
|---|---|
| **RLS** | Row-Level Security. Postgres feature that filters rows based on the requesting user. We use it to enforce "public read on verified deals, admin write only". |
| **VC** | Venture Capital. One of the investor `type` values. |
| **OG tags** | Open Graph meta tags — what social previews show. Generated by `lib/seo.ts`. |
| **NL search** | Natural language search backed by the AI layer, with deterministic fallback behavior when AI is unavailable. |
| **CSV** | Comma-separated values. The bulk import / export format. |
| **CLI** | Command-line interface. The pipeline's invocation style (`python -m pipeline.run …`). |
| **ANN** | Approximate Nearest Neighbour — a search technique. Mentioned as a future scaling path for entity resolution. |
| **API** | Application Programming Interface. Arthaive exposes public API v1 under `/api/v1/*`. |
