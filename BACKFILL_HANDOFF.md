# Historical Funding Backfill — Session Handoff

**Goal:** Backfill the Indian startup funding dataset (`data/funding-data.ts`, which the live
site reads) with deals from **2015 onward**, using **Claude itself as the extractor** instead of
the paid Anthropic API. Extraction is done by spawning `general-purpose` subagents that read raw
article text and emit structured deal JSON — no `ANTHROPIC_API_KEY`, no external API call.

**This handoff asks the next session to redo / complete the backfill from 2017 → 2023.**

---

## TL;DR for the next session

1. Read this file and `pipeline/EXTRACT_INSTRUCTIONS.md` (the subagent extraction protocol).
2. The whole pipeline is idempotent (dedup by source URL **and** by `(company, date)`), so
   re-running any year is safe — `--skip-existing` makes re-crawls only fetch *new* URLs.
3. Work **year by year, 2017 → 2023**, and within each year do all applicable sources
   (Inc42 2015→, Entrackr 2017→, YourStory 2015→). Run `clean_backfill.py` after.
4. Subagent extraction repeatedly hits the **session usage limit**. When it does, do limit-free
   work (crawl → bucket → write rule-resolved) and resume extraction after the reset. Partially
   failed subagents usually still WROTE their output file — salvage it, only re-run truly missing chunks.

---

## Current state (as of this handoff)

Dataset total: **6,490** deals (baseline was 2,157). Earliest date 2015-01-02.

| Year | Deals | Status |
|---|---|---|
| 2015 | 1,022 | complete + cleaned (Inc42 + YourStory) |
| 2016 | 1,020 | complete + cleaned (Inc42 + YourStory) |
| 2017 | 712  | **SUSPECT — under-collected.** Inc42 2017 crawl only scanned 559 URLs vs ~1,060 for 2015/2016. Likely a paginated-sitemap selection gap. **REDO 2017.** |
| 2018 | 917  | complete + cleaned, EXCEPT YS-2018 chunk_02 (1 chunk, ~130 candidates) never extracted (died on session limit). |
| 2019 | 662  | **PARTIAL** — only rule-resolved deals from Entrackr + YourStory written. Inc42 2019 + ALL 2019 residual (Claude) extraction still pending. |
| 2020–2023 | 0 | not started. |
| 2024–2026 | 2,157 | original baseline — **do not touch**. |

> Ground truth is always the per-year counts in `data/funding-data.ts`, not any tally. Recompute:
> ```python
> import json; s=open('data/funding-data.ts').read()
> deals=json.loads(s.split('FundingDeal[] = ',1)[1].rstrip().rstrip(';'))
> from collections import Counter; print(Counter(d['date'][:4] for d in deals))
> ```

---

## The pipeline (modules in `pipeline/`)

| Module | Role |
|---|---|
| `dump_candidates.py` | Free crawl+fetch (sitemaps) → JSONL `{url,title,pub_date,body}`. NO AI, NO DB. `--skip-existing` skips URLs already in `funding_data/`. |
| `discovery.py` | Sitemap walkers. `until` upper bound for windowing. Modes: `paginated` (Inc42), `daily` (Entrackr), `weekly` (YourStory). |
| `config.py` | `SOURCES` registry, `FUNDING_SLUG_HINTS` (URL pre-filter). |
| `rule_extractor.py` | Free regex/keyword extraction (amount, company, stage, investors, sectors, location). |
| `backfill_local.py` | Runs rule_extract + attaches pub_date; **buckets** candidates → `resolved` (clean, written directly) / `needs_claude` (residual for subagents) / `drop`. `--skip-existing`. |
| `write_csv.py` | Deal records → `funding_data/<W# Q# FY##>/data.csv`. Dedup by URL + `(company,date)`. `$10B` amount cap. |
| `fy_calendar.py` | `date → "W# Q# FY##"` folder name (Indian FY; verified). |
| `clean_backfill.py` | Removes foreign/investor/junk rows from pre-2024 CSVs (blocklist + amount cap). Re-run after writing new years. |
| `EXTRACT_INSTRUCTIONS.md` | The exact protocol each extraction subagent must follow. |

**Sources by era:** Inc42 2015→ (paginated sitemaps), Entrackr 2017-05→ (daily sitemaps),
YourStory ~2015→ (weekly sitemaps). Entrackr does NOT cover 2015/2016.

---

## Per-(source, year) workflow

```bash
cd /Users/bharath.bhaktha/Documents/Beta/Arthaive
PY=pipeline/.venv/bin/python

# 1. Crawl (background; detached crawls are NOT harness-tracked, poll the log).
$PY -m pipeline.dump_candidates --source <inc42|entrackr|yourstory> \
    --since YYYY-01-01 --until YYYY-12-31 --skip-existing --body-chars 2600 --sleep 0.05 \
    --out /tmp/backfill/cand_<src>_<YYYY>.jsonl

# 2. Bucket (local, fast).
$PY -m pipeline.backfill_local --in /tmp/backfill/cand_<src>_<YYYY>.jsonl \
    --out-prefix /tmp/backfill/<src>_<YYYY> --skip-existing

# 3. Write the rule-resolved deals immediately (free, high precision).
$PY -m pipeline.write_csv --in /tmp/backfill/<src>_<YYYY>.resolved.jsonl

# 4. Split the residual into chunks of ~120-130 lines:
$PY -c "
recs=[l for l in open('/tmp/backfill/<src>_<YYYY>.needs_claude.jsonl') if l.strip()]
size=130; n=0
for i in range(0,len(recs),size):
    open(f'/tmp/backfill/<src>_<YYYY>.needs.chunk_{n:02d}.jsonl','w').writelines(recs[i:i+size]); n+=1
print('chunks:',n)"

# 5. Spawn ONE general-purpose subagent PER chunk (parallel). Each subagent prompt is just:
#    "Read pipeline/EXTRACT_INSTRUCTIONS.md and follow it EXACTLY.
#     INPUT: /tmp/backfill/<src>_<YYYY>.needs.chunk_NN.jsonl
#     OUTPUT: /tmp/backfill/<src>_<YYYY>.claude.chunk_NN.jsonl
#     Return only the compact summary."

# 6. Write all the subagent outputs (signature dedup handles cross-source overlap):
$PY -m pipeline.write_csv --in /tmp/backfill/<src>_<YYYY>.claude.chunk_*.jsonl

# 7. After finishing a year, regenerate + clean:
npm run generate-data
$PY -m pipeline.clean_backfill            # re-run; --dry-run first to preview
npm run generate-data
```

`/tmp/backfill/` is scratch and will NOT survive into a new machine/session — recreate it
(`mkdir -p /tmp/backfill`). Only the repo (`funding_data/`, `data/funding-data.ts`) is durable.

---

## The plan: redo from 2017

1. **2017 — REDO (coverage gap).** First diagnose why Inc42 2017 only scanned ~559 URLs.
   Check `_paginated_sitemaps()` in `discovery.py`: list Inc42's `post-sitemap*.xml` `lastmod`s and
   confirm every sub-sitemap overlapping Jan–Dec 2017 is selected (the overlap window logic may drop
   a boundary file). Then re-crawl Inc42 2017 with `--skip-existing` (only new URLs are fetched),
   plus Entrackr 2017 and YourStory 2017, and extract. Existing 2017 deals are preserved; this only
   fills the gap.
2. **2018 — finish.** Re-run just the missing `ys_2018` chunk (or re-crawl YourStory 2018
   `--skip-existing`), extract, write.
3. **2019 — finish.** Inc42 2019 + the already-bucketed Entrackr/YS 2019 residual chunks need
   subagent extraction. (Resolved deals for Entrackr/YS 2019 are already written.)
4. **2020, 2021, 2022, 2023 — do fully** (all three sources each).
5. **Final pass:** `clean_backfill.py`; `npm run generate-data`; `npx tsc --noEmit` (or `npm run build`);
   re-verify per-year counts are monotonic-ish and `min(date)` is 2015; spot-check ~10 deals vs source URLs.

---

## Hard-won lessons / gotchas

- **Units:** `data/funding-data.ts` `amount` is in **lakhs**. `$M = amount / 835`
  (`amountInLakhs = $M × 83.5 × 10`). Do NOT divide by 83.5 (that's a 10× error).
- **CSV currency:** store INR-original deals as `$M = ₹Cr / 8.35` (round-trips the ₹ figure
  faithfully); USD-original deals store the actual `$M`. `write_csv.to_usd_millions` handles this.
- **India-only:** early batches (2015–2017, before the rule was added) leaked foreign companies
  (NetSuite, Uber, Didi, Ant Financial, Deliveroo…). `EXTRACT_INSTRUCTIONS.md` now says skip
  non-Indian deals. `clean_backfill.py` removed the visible ones; small (<$100M) foreign deals from
  those early batches may still linger — consider widening the blocklist or a stricter re-pass.
- **Misparses:** subagents occasionally take a valuation/round-total as the round size. The $10B
  write cap + clean_backfill catch egregious ones; OYO $2.5B (2017-09) and Ola $2B (2017-10) are
  borderline kept.
- **Session limit:** subagents return 0 tokens when limited (message names a reset time). A limited
  subagent often still WROTE its file first — validate (`json.loads` each line, expect 13 keys) and
  write it; only re-dispatch chunks whose output file is missing/empty.
- **Roundups:** "Funding Galore" / weekly digests are skipped by the protocol (they duplicate
  individual articles); deals appearing ONLY in a roundup can be missed — acceptable tradeoff.

---

## Scope NOT in this work / do not commit

The branch also has unrelated pre-existing frontend WIP (`app/`, `components/`, `supabase/`,
`PHASES.md`, `.github/`). That is NOT part of the backfill and was intentionally left uncommitted.
