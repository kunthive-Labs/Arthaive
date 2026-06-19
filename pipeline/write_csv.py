"""Write extracted deal records into the funding_data/ week-folder CSVs.

Input: JSONL where each line is an *extractor-schema* dict — the same shape
produced by pipeline.rule_extractor.rule_extract and pipeline.extractor.extract_deal
(and the shape Claude emits when acting as the residual extractor):

    {
      "company": str,
      "amount_value": number|null,        # in base units of amount_currency
      "amount_currency": "USD"|"INR"|"OTHER"|null,
      "amount_raw": str|null,
      "stage": str|null,
      "sectors": [str],
      "investors": [str],
      "lead_investor": str|null,
      "deal_date": "YYYY-MM-DD",
      "location": str|null,
      "source_url": str,                   # added by backfill_local / extractor caller
      ...
    }

Output: appends/merges into funding_data/<W# Q# FY##>/data.csv with the exact
columns generate-funding-data.js expects:

    Company,Amount ($M),Date,HQ,Sector,Series,Source,Investors

Currency convention (matches existing rows, verified vs "Simple Energy $29.94" <-> "Rs 250 Cr"):
    USD amount -> $M = value / 1e6
    INR amount -> $M = (value / 1e7 crore) / 8.35     i.e. value / 8.35e7

Idempotent: rows are de-duplicated by Source URL within each target file, so
re-running a year never doubles its deals.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from pipeline.fy_calendar import folder_name

_ROOT = Path(__file__).resolve().parent.parent
_FUNDING_DIR = _ROOT / "funding_data"

CSV_HEADER = ["Company", "Amount ($M)", "Date", "HQ", "Sector", "Series", "Source", "Investors"]

# Reverse of generate-funding-data.js's flat USD_TO_INR=83.5: storing ₹Cr/8.35 as
# $M makes the displayed ₹ figure round-trip exactly. Keep in sync with config/currency.js.
_USD_TO_INR = 83.5


def to_usd_millions(amount_value: float | None, currency: str | None) -> float | None:
    """Convert a native-currency amount to USD-millions for the CSV column."""
    if amount_value is None or currency is None:
        return None
    try:
        v = float(amount_value)
    except (TypeError, ValueError):
        return None
    if v <= 0:
        return None
    cur = currency.upper()
    if cur == "USD":
        return v / 1e6
    if cur == "INR":
        # v is in rupees; ₹Cr = v/1e7; $M = ₹Cr / 8.35
        return (v / 1e7) / (_USD_TO_INR / 10.0)
    return None  # OTHER / unknown -> treat as undisclosed amount


def _clean_cell(s: Any) -> str:
    """CSV-safe scalar: collapse whitespace, drop embedded double-quotes.

    generate-funding-data.js's hand-rolled parser toggles on `"` and does NOT
    understand `""` escaping, so we strip embedded quotes rather than escape them.
    """
    if s is None:
        return ""
    text = str(s).replace('"', "").replace("\n", " ").replace("\r", " ")
    return " ".join(text.split()).strip()


def _ordered_investors(rec: dict) -> list[str]:
    investors = [i for i in (rec.get("investors") or []) if i and str(i).strip()]
    lead = rec.get("lead_investor")
    out: list[str] = []
    seen: set[str] = set()
    for name in ([lead] if lead else []) + investors:
        c = _clean_cell(name)
        key = c.lower()
        if c and key not in seen:
            seen.add(key)
            out.append(c)
    return out


def record_to_row(rec: dict) -> dict[str, str] | None:
    """Convert one extractor-schema record to a CSV row dict, or None to skip."""
    company = _clean_cell(rec.get("company"))
    deal_date = (rec.get("deal_date") or "").strip()
    if not company or not deal_date:
        return None
    try:
        d = date.fromisoformat(deal_date[:10])
    except ValueError:
        return None

    usd_m = to_usd_millions(rec.get("amount_value"), rec.get("amount_currency"))
    # Backstop against misclassified foreign mega-deals (e.g. Bayer/Monsanto $66B,
    # Rosneft $13B): no Indian startup round has ever exceeded ~$6B, so >$10B is noise.
    if usd_m is not None and usd_m > 10000:
        return None
    stage = _clean_cell(rec.get("stage"))
    # Every record here is already a confirmed funding event, so keep undisclosed-amount,
    # unknown-stage rounds too (max coverage). Label the stage "Undisclosed" so
    # generate-funding-data.js keeps them — it only drops amount==0 AND stage=='Not Disclosed'.
    if usd_m is None and not stage:
        stage = "Undisclosed"

    sectors = rec.get("sectors") or []
    sector = _clean_cell(sectors[0]) if sectors else ""
    investors = _ordered_investors(rec)

    return {
        "Company": company,
        "Amount ($M)": f"${usd_m:.2f}" if usd_m is not None else "",
        "Date": d.strftime("%d/%m/%Y"),
        "HQ": _clean_cell(rec.get("location")) or "India",
        "Sector": sector or "General",
        "Series": stage,
        "Source": _clean_cell(rec.get("source_url") or rec.get("url")),
        "Investors": ";".join(investors),
    }, d


def _existing_sources(csv_path: Path) -> set[str]:
    if not csv_path.exists():
        return set()
    seen: set[str] = set()
    with csv_path.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            src = (row.get("Source") or "").strip()
            if src:
                seen.add(src)
    return seen


def _sig(company: str, date_str: str) -> str:
    """Cross-source dedup key: a company almost never closes two distinct rounds
    on the same calendar day, so (company, date) collapses the same deal reported
    by different publishers under different URLs."""
    return f"{company.strip().lower()}|{date_str.strip()}"


def _existing_signatures() -> set[str]:
    """All (company, date) signatures already written across funding_data/*/data.csv."""
    sigs: set[str] = set()
    if not _FUNDING_DIR.exists():
        return sigs
    for csv_path in _FUNDING_DIR.glob("*/data.csv"):
        try:
            with csv_path.open(encoding="utf-8-sig", newline="") as fh:
                for row in csv.DictReader(fh):
                    company = (row.get("Company") or "").strip()
                    dt = (row.get("Date") or "").strip()
                    if company and dt:
                        sigs.add(_sig(company, dt))
        except OSError:
            continue
    return sigs


def write_records(records: Iterable[dict], *, dry_run: bool = False) -> dict[str, int]:
    """Group records by week-folder and append new rows. Returns a stats dict.

    Dedup is two-layer: by Source URL (idempotent re-runs) and by (company, date)
    signature against everything already written + within this batch (cross-source).
    """
    by_folder: dict[str, list[dict]] = defaultdict(list)
    stats = {"input": 0, "skipped": 0, "written": 0, "dup_in_batch": 0, "dup_signature": 0, "folders": 0}
    seen_src_global: set[str] = set()
    seen_sig: set[str] = _existing_signatures()

    for rec in records:
        stats["input"] += 1
        converted = record_to_row(rec)
        if converted is None:
            stats["skipped"] += 1
            continue
        row, d = converted
        folder = folder_name(d)
        by_folder[folder].append(row)

    for folder, rows in sorted(by_folder.items()):
        folder_path = _FUNDING_DIR / folder
        csv_path = folder_path / "data.csv"
        existing = _existing_sources(csv_path)
        new_rows: list[dict] = []
        for row in rows:
            src = row["Source"]
            if src and (src in existing or src in seen_src_global):
                stats["dup_in_batch"] += 1
                continue
            sig = _sig(row["Company"], row["Date"])
            if sig in seen_sig:
                stats["dup_signature"] += 1
                continue
            if src:
                seen_src_global.add(src)
            seen_sig.add(sig)
            new_rows.append(row)
        if not new_rows:
            continue
        stats["written"] += len(new_rows)
        stats["folders"] += 1
        if dry_run:
            continue
        folder_path.mkdir(parents=True, exist_ok=True)
        write_header = not csv_path.exists()
        with csv_path.open("a", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=CSV_HEADER, quoting=csv.QUOTE_MINIMAL)
            if write_header:
                w.writeheader()
            for row in new_rows:
                w.writerow(row)

    return stats


def _read_jsonl(paths: list[str]) -> Iterable[dict]:
    for p in paths:
        with open(p, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def main() -> int:
    ap = argparse.ArgumentParser(description="Write extractor-schema JSONL into funding_data/ CSVs")
    ap.add_argument("--in", dest="inputs", nargs="+", required=True, help="One or more JSONL files")
    ap.add_argument("--dry-run", action="store_true", help="Report what would be written, no file changes")
    args = ap.parse_args()
    stats = write_records(_read_jsonl(args.inputs), dry_run=args.dry_run)
    print(json.dumps({"dry_run": args.dry_run, **stats}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
