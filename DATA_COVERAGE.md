# Data Coverage & Collection Status

_Last updated: 2026-07-11_

This document tracks **what funding data Arthaive currently holds**, **how it was collected**, and **what is still pending**. The original goal — continuous coverage from 2015 onwards — has been **achieved and extended back to 2005** via the historical backfill restored from the production database export.

---

## 1. Current coverage

| Metric | Value |
|---|---|
| Total deals | **14,739** |
| Earliest deal | **7 Dec 2005** |
| Latest deal | **2 Jun 2026** (current) |
| Years covered | **2005 → 2026** — every year populated (2005–2014 is sparser historical coverage) |
| Source of record | static CSVs in `funding_data/` → `data/funding-data.ts` |

### Deals per calendar year

| Year | Deals | Status |
|---|---|---|
| 2005 | 3 | ✅ Historical backfill (sparse) |
| 2006 | 72 | ✅ Historical backfill |
| 2007 | 126 | ✅ Historical backfill |
| 2008 | 98 | ✅ Historical backfill |
| 2009 | 10 | ✅ Historical backfill (sparse) |
| 2010 | 36 | ✅ Historical backfill |
| 2011 | 68 | ✅ Historical backfill |
| 2012 | 178 | ✅ Historical backfill |
| 2013 | 179 | ✅ Historical backfill |
| 2014 | 202 | ✅ Historical backfill |
| 2015 | 1,022 | ✅ Full year |
| 2016 | 1,019 | ✅ Full year |
| 2017 | 711 | ✅ Full year |
| 2018 | 944 | ✅ Full year |
| 2019 | 1,334 | ✅ Full year |
| 2020 | 1,263 | ✅ Full year |
| 2021 | 2,358 | ✅ Full year |
| 2022 | 1,646 | ✅ Full year |
| 2023 | 1,281 | ✅ Full year |
| 2024 | 867 | ✅ Full year |
| 2025 | 860 | ✅ Full year |
| 2026 | 462 | ✅ Jan 1 → Jun 2 (current) |
| **Total** | **14,739** | |

> Counts verified against the generated `data/funding-data.ts` (header `Total deals: 14739`; per-year tally computed from record dates).

### Most recent collection

- Investor data captured per deal (`Investors` column; lead listed first).
- The 2015–2023 historical backfill is **complete**, closing the previously-open 9-year gap.
- **2026-07-11:** the 2005–2014 historical deals (972 records) plus 36 later enriched records — which previously existed only in the Supabase production database — were restored into `funding_data/` week-folder CSVs from the database export (`scripts/restore-deals-from-export.py`), bringing the static dataset to exact parity with the database (14,739 deals, id-for-id). Pre-2015 amounts use period-correct ₹→USD rates from `config/currency.js` (`USD_TO_INR_BY_YEAR`).

---

## 2. Sources used

| Source | URL | Status | Notes |
|---|---|---|---|
| **Entrackr** | https://entrackr.com | ✅ **In use** | Wired in `pipeline/config.py`. Live scraped via daily-sitemap discovery + article fetch. |
| **Inc42** | https://inc42.com | ✅ **In use** | Wired in `pipeline/config.py` (`sitemap_mode: paginated`). Paginated sitemaps reach back to 2015 and were the primary path for the historical backfill. |

**How collection works (no API key, no cost):**
`pipeline/dump_candidates.py` walks the source sitemaps, fetches each funding article, and saves title + lede + date to JSONL. Structured fields (company, amount, stage, sector, city, investors) are then extracted from that text and written to weekly CSVs under `funding_data/`. Amounts use ₹→USD at the rate in `config/currency.js` (currently ₹83.50/USD). Every deal stores its source URL for audit.

---

## 3. Pending / not-yet-implemented sources

| Source | URL | Status |
|---|---|---|
| **YourStory** | https://yourstory.com | ⛔ Pending — no connector |
| Wayback Machine | https://archive.org | ⚙️ Fallback only (dead-link recovery), not a primary source |

> Adding YourStory would mainly broaden coverage of deals the current sources missed. It is **not** required to reach 2015 — Entrackr + Inc42 already provide continuous 2015–2026 coverage.

---

## 4. Years — goal: data from 2015 ✅ ACHIEVED (extended to 2005)

Target was **continuous coverage from 2015 → present**. This is in place, and coverage now extends back to **2005** through the restored historical backfill: every year 2005 through 2026 is populated (2005–2014 at lower density, reflecting the smaller deal universe and sparser sources of that era).

| Year | Status |
|---|---|
| 2005–2014 | ✅ Covered (historical backfill, 972 deals) |
| 2015 | ✅ Covered |
| 2016 | ✅ Covered |
| 2017 | ✅ Covered |
| 2018 | ✅ Covered |
| 2019 | ✅ Covered |
| 2020 | ✅ Covered |
| 2021 | ✅ Covered |
| 2022 | ✅ Covered |
| 2023 | ✅ Covered |
| 2024 | ✅ Covered |
| 2025 | ✅ Covered |
| 2026 | ✅ Covered (through 2 Jun) |

**Gap remaining: none.**

### Notes on the historical backfill
- Inc42's paginated sitemaps reach back to 2015 and carried the bulk of the 2015–2023 backfill; Entrackr supplemented later years.
- The 2005–2014 deals came from a separate historical backfill (primarily VCCircle-era sources) that originally lived only in the production database; they are now restored into `funding_data/` CSVs.
- ₹→USD conversions: 2005–2014 deals use **period-correct annual average rates** (₹44–61/USD, see `USD_TO_INR_BY_YEAR` in `config/currency.js`); 2015+ uses the single configured rate (₹83.50). Extending period-correct rates to 2015–2025 remains a future accuracy improvement.

---

## 5. Other open items (not data-coverage, but relevant to "go-live")

- **Automated collection.** Ongoing freshness needs a scheduler (e.g. GitHub Actions cron) — see roadmap.
- **`/login` production build** previously failed without Supabase env vars (tracked separately).

---

## 6. Suggested next steps

1. Add a **YourStory** connector to broaden coverage of missed deals.
2. Apply **period-correct exchange rates** for pre-2026 deals instead of the single ₹83.50 rate.
3. Wire a **scheduler** so new deals are collected automatically going forward.
