"""Clean noise from the backfilled (pre-2024) funding_data CSVs.

The Claude residual extractor, before the India-only rule was added, let through
three classes of bad rows that the verification surfaced:
  1. Foreign companies (not Indian startups).
  2. Misparsed amounts (a valuation / round-total taken as the round size).
  3. Investor names or junk tokens used as the company.

This module rewrites each funding_data/<folder>/data.csv, dropping rows (only for
deal dates BEFORE 2024 — the pre-existing baseline is left untouched) that match:
  - Amount > AMOUNT_CAP_USD_M ($M). No Indian startup round exceeded ~$2.5B in
    2015-2018, so anything larger is a foreign deal or a misparse.
  - Company name in a foreign / investor / junk blocklist (catches sub-cap noise).

Run with --dry-run first to see what would be removed.
"""
from __future__ import annotations

import argparse
import csv
import json
from datetime import date
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_FUNDING_DIR = _ROOT / "funding_data"

# Largest genuine Indian startup round 2015-2018 was ~$2.5B (Flipkart/SoftBank, Aug 2017).
AMOUNT_CAP_USD_M = 2500.0
_USD_TO_INR = 83.5

# Only clean backfilled deals; leave the pre-existing 2024+ baseline alone.
CLEAN_BEFORE = date(2024, 1, 1)

# Lowercased exact-match blocklist: foreign cos, investors-as-company, junk tokens.
_BLOCKLIST = {
    # foreign companies wrongly emitted
    "netsuite", "yahoo", "uber", "didi chuxing", "meituan-dianping", "ant financial services",
    "ant financial", "snapchat", "netflix", "go-jek", "gojek", "solarcity", "jet", "tnt express",
    "samsung printer business", "dollar shave club", "airbnb", "lyft", "magic leap", "grab",
    "singapore's grab", "ofo", "mobike", "sea", "sensetime", "slack", "nervana systems",
    "deliveroo", "automation anywhere", "instacart", "kreditech", "expedia", "blablacar",
    "panaya", "tencent", "magic pony technology", "thoughtspot", "appirio", "oneweb",
    "komli media", "komli", "business insider", "mpower financing", "dollar shave",
    "snapdeal/freecharge lovestruck", "wunder mobility", "uipath", "stripe", "didi",
    "elon musk", "amit bhardwaj",
    # investors / VC firms wrongly used as the company
    "sequoia", "sequoia india", "sequoia capital", "peak xv", "premjiinvest", "premji invest",
    "avendus capital", "avendus", "lightbox venture", "lightbox", "tiger global", "softbank",
    "matrix partners", "nexus venture partners", "accel", "kalaari capital", "blume ventures",
    # junk / non-company tokens seen as the "company"
    "that", "questions", "question", "india", "government", "finally", "flipkart finally",
    "entrackr", "inc42", "yourstory", "buddy", "life circle",
    # generic words a regex extractor mistook for a company name
    "funding", "it", "govt", "the", "this", "startup", "startups", "company", "indian",
    # month names parsed as the company (from "<Month> ..." headlines)
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    # investor / VC firms wrongly used as the company (extends the list above)
    "lightspeed", "lightspeed india", "steadview", "steadview capital", "falcon edge",
    "chiratae ventures", "elevation capital", "general atlantic", "ribbit capital",
    "leapfrog investments", "leapfrog",
    # large non-startups (IT majors) misparsed from "<corp> bags $X deal" headlines
    "wipro",
}


def _usd_m(amount_field: str) -> float | None:
    s = (amount_field or "").replace("$", "").replace(",", "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _row_date(date_field: str) -> date | None:
    parts = (date_field or "").split("/")
    if len(parts) != 3:
        return None
    try:
        d, m, y = (int(p) for p in parts)
        return date(y, m, d)
    except ValueError:
        return None


def _is_bad(row: dict) -> str | None:
    """Return a reason string if the row should be dropped, else None."""
    d = _row_date(row.get("Date", ""))
    if d is None or d >= CLEAN_BEFORE:
        return None  # only clean dated backfill rows
    company = (row.get("Company") or "").strip().lower()
    if company in _BLOCKLIST:
        return "blocklist"
    usd_m = _usd_m(row.get("Amount ($M)", ""))
    if usd_m is not None and usd_m > AMOUNT_CAP_USD_M:
        return "amount_cap"
    return None


def clean(dry_run: bool = True) -> dict:
    stats = {"files": 0, "rows": 0, "removed": 0, "by_reason": {}, "samples": []}
    for csv_path in sorted(_FUNDING_DIR.glob("*/data.csv")):
        with csv_path.open(encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            fieldnames = reader.fieldnames
            rows = list(reader)
        kept, removed = [], []
        for row in rows:
            stats["rows"] += 1
            reason = _is_bad(row)
            if reason:
                stats["removed"] += 1
                stats["by_reason"][reason] = stats["by_reason"].get(reason, 0) + 1
                removed.append((row, reason))
                if len(stats["samples"]) < 25:
                    stats["samples"].append(
                        f'{reason}: {row.get("Company")} | {row.get("Amount ($M)")} | {row.get("Date")}'
                    )
            else:
                kept.append(row)
        if removed:
            stats["files"] += 1
            if not dry_run:
                with csv_path.open("w", encoding="utf-8", newline="") as fh:
                    w = csv.DictWriter(fh, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
                    w.writeheader()
                    w.writerows(kept)
    return stats


def main() -> int:
    ap = argparse.ArgumentParser(description="Clean foreign/misparsed/junk rows from backfilled CSVs")
    ap.add_argument("--dry-run", action="store_true", help="Report only; don't rewrite CSVs")
    args = ap.parse_args()
    stats = clean(dry_run=args.dry_run)
    print(json.dumps({k: v for k, v in stats.items() if k != "samples"}, indent=2))
    print("\nsamples:")
    for s in stats["samples"]:
        print("  ", s)
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
