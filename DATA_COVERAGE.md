# Data Coverage & Collection Status

_Last updated: 2026-06-19_

This document tracks **what funding data Arthaive currently holds**, **how it was collected**, and **what is still pending**. The original goal — **continuous coverage from 2015 onwards** — has been **achieved**.

---

## 1. Current coverage

| Metric | Value |
|---|---|
| Total deals | **13,731** |
| Earliest deal | **2 Jan 2015** |
| Latest deal | **2 Jun 2026** (current) |
| Years covered | **2015 → 2026** — continuous, no gaps |
| Source of record | static CSVs in `funding_data/` → `data/funding-data.ts` |

### Deals per calendar year

| Year | Deals | Status |
|---|---|---|
| 2015 | 1,021 | ✅ Full year |
| 2016 | 1,019 | ✅ Full year |
| 2017 | 710 | ✅ Full year |
| 2018 | 944 | ✅ Full year |
| 2019 | 1,333 | ✅ Full year |
| 2020 | 1,263 | ✅ Full year |
| 2021 | 2,357 | ✅ Full year |
| 2022 | 1,646 | ✅ Full year |
| 2023 | 1,281 | ✅ Full year |
| 2024 | 853 | ✅ Full year |
| 2025 | 842 | ✅ Full year |
| 2026 | 462 | ✅ Jan 1 → Jun 2 (current) |
| **Total** | **13,731** | |

> Counts verified against the generated `data/funding-data.ts` (header `Total deals: 13731`; per-year tally computed from record dates).

### Most recent collection

- Investor data captured per deal (`Investors` column; lead listed first).
- The 2015–2023 historical backfill is **complete**, closing the previously-open 9-year gap and producing a continuous 2015–2026 dataset.

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

## 4. Years — goal: data from 2015 ✅ ACHIEVED

Target was **continuous coverage from 2015 → present**. This is now in place: every year 2015 through 2026 is populated, with no gaps.

| Year | Status |
|---|---|
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
- Older ₹→USD conversions currently use the single configured rate (₹83.50). Using **period-appropriate exchange rates** for pre-2026 deals remains a future accuracy improvement — see §6.

---

## 5. Other open items (not data-coverage, but relevant to "go-live")

- **Automated collection.** Ongoing freshness needs a scheduler (e.g. GitHub Actions cron) — see roadmap.
- **`/login` production build** previously failed without Supabase env vars (tracked separately).

---

## 6. Suggested next steps

1. Add a **YourStory** connector to broaden coverage of missed deals.
2. Apply **period-correct exchange rates** for pre-2026 deals instead of the single ₹83.50 rate.
3. Wire a **scheduler** so new deals are collected automatically going forward.
