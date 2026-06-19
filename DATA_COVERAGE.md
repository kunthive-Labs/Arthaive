# Data Coverage & Collection Status

_Last updated: 2026-06-03_

This document tracks **what funding data Arthaive currently holds**, **how it was collected**, and **what is still pending** — including the goal of covering data **from 2015 onwards**.

---

## 1. Current coverage

| Metric | Value |
|---|---|
| Total deals | **2,157** |
| Earliest deal | **2 Jan 2024** |
| Latest deal | **2 Jan 2026 → 2 Jun 2026** (current) |
| Months covered | **~30 months** (Jan 2024 → Jun 2026) |
| Source of record | static CSVs in `funding_data/` → `data/funding-data.ts` |

### Deals per calendar year

| Year | Deals | Status |
|---|---|---|
| 2024 | 853 | ✅ Full year |
| 2025 | 842 | ✅ Full year |
| 2026 | 462 | ✅ Jan 1 → Jun 2 (current) |

### Most recent collection (this backfill)

- **462 deals** added for **1 Jan 2026 → 2 Jun 2026** (~5 months / 154-day window; 104 distinct days had deals).
- Closed the gap between the previously-frozen data (ended Dec 2025) and today.
- Investor data now captured per deal (new `Investors` column).

---

## 2. Source used

| Source | URL | Status | Notes |
|---|---|---|---|
| **Entrackr** | https://entrackr.com | ✅ **In use** | Wired in `pipeline/config.py`. Live scraped via daily-sitemap discovery + article fetch. |
| **Inc42** | https://inc42.com | 🟡 **Connector built** | Wired in `pipeline/config.py` (`sitemap_mode: paginated`). Validated on a recent window (21 funding articles, May 25–Jun 5 2026). Discovery + fetch proven; full structured harvest pending (needs extraction + scope decision — see §6). Sitemaps reach back to **2015**, so this is the path to the historical backfill. |

**How collection works (no API key, no cost):**
`pipeline/dump_candidates.py` walks Entrackr's daily sitemaps, fetches each funding article, and saves title + lede + date to JSONL. Structured fields (company, amount, stage, sector, city, investors) are then extracted from that text and written to weekly CSVs under `funding_data/`. Amounts use ₹→USD at the rate in `config/currency.js` (currently ₹83.50/USD). Every deal stores its source URL for audit.

---

## 3. Pending websites (not yet implemented)

| Source | URL | Status |
|---|---|---|
| **Inc42** | https://inc42.com | 🟡 Connector built (see §2) — structured harvest not yet run |
| **YourStory** | https://yourstory.com | ⛔ Pending — no connector |
| Wayback Machine | https://archive.org | ⚙️ Fallback only (dead-link recovery), not a primary source |

> Adding these mainly broadens coverage of deals Entrackr missed, and is the main path to reliably reaching **older years** (Entrackr's live sitemap may not expose articles back to 2015).

---

## 4. Pending years — goal: data from 2015

Target: **continuous coverage from 2015 → present.** Currently only **2024–2026** exists. There is **no data before 2024** in the repo.

| Year | Status |
|---|---|
| 2015 | ⛔ Missing |
| 2016 | ⛔ Missing |
| 2017 | ⛔ Missing |
| 2018 | ⛔ Missing |
| 2019 | ⛔ Missing |
| 2020 | ⛔ Missing |
| 2021 | ⛔ Missing |
| 2022 | ⛔ Missing |
| 2023 | ⛔ Missing |
| 2024 | ✅ Covered |
| 2025 | ✅ Covered |
| 2026 | ✅ Covered (through 2 Jun) |

**Gap to close: 9 years (2015–2023).**

### Feasibility notes for the historical backfill
- Entrackr's **daily sitemaps likely don't reach back to 2015** — historical articles may require Wayback Machine crawling and/or Inc42 & YourStory archives.
- Volume will be large: 2024–2025 averaged ~850 deals/year, so 2015–2023 could be **several thousand deals** total (earlier years lighter, later years heavier).
- Older ₹→USD conversions should ideally use **period-appropriate exchange rates**, not today's ₹83.50, for historical accuracy.

---

## 5. Other open items (not data-coverage, but block "go-live")

- **Automated collection is not set up.** All collection so far is manual/one-off. Ongoing freshness needs a scheduler (e.g. GitHub Actions cron) — see roadmap.
- **`/login` production build** currently fails without Supabase env vars (separate issue).

---

## 6. Suggested next steps

1. ✅ **Inc42 connector** implemented (`sitemap_mode: paginated`, reaches 2015). Next: run the structured harvest (recent first, then backfill) — needs `ANTHROPIC_API_KEY` for the AI extractor. Then add a **YourStory** connector.
2. Inc42 paginated sitemaps already reach 2015, reducing the need for a separate Wayback crawler for 2015–2023.
3. Use **period-correct exchange rates** for pre-2026 deals.
4. Wire a **scheduler** so new deals are collected automatically going forward.
