#!/usr/bin/env python3
"""Restore deals that exist in the Supabase export but not in funding_data/ CSVs.

Deal ids are `<week_folder>-<csv_row_index>`, so restored rows must land at the
exact row index their id encodes:
- folders absent from funding_data/ are written whole (suffixes are contiguous 1..N)
- rows whose folder exists get their CSV line replaced in place (these are rows the
  generator skips as empty but that were enriched in the DB, e.g. stage 'Unknown')

Usage: python3 scripts/restore-deals-from-export.py
Reads supabase_export/deals.json and data/funding-data.ts; writes funding_data/.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEADER = "Company,Amount ($M),Date,HQ,Sector,Series,Source,Investors"


def csv_field(value):
    value = "" if value is None else str(value)
    if any(c in value for c in ',"\n'):
        return '"' + value.replace('"', '""') + '"'
    return value


def fmt_amount(usd):
    if not usd:
        return ""
    text = ("%f" % float(usd)).rstrip("0").rstrip(".")
    return f"${text}"


def to_csv_row(deal):
    y, m, d = deal["deal_date"].split("-")
    investors = deal.get("investors") or []
    if investors == ["Not Disclosed"]:
        investors = []
    sectors = deal.get("sectors") or []
    return ",".join(
        csv_field(v)
        for v in [
            deal["company"],
            fmt_amount(deal.get("amount_usd")),
            f"{d}/{m}/{y}",
            deal.get("location") or "India",
            sectors[0] if sectors else "General",
            deal.get("stage") or "",
            deal.get("source_url") or "",
            ";".join(investors),
        ]
    )


def suffix(deal):
    return int(deal["id"].rsplit("-", 1)[1])


def main():
    deals = json.load(open(os.path.join(ROOT, "supabase_export/deals.json")))
    static_src = open(os.path.join(ROOT, "data/funding-data.ts")).read()
    static_ids = set(re.findall(r'"id": "([^"]+)"', static_src))
    missing = [d for d in deals if d["id"] not in static_ids]

    by_folder = {}
    for d in missing:
        by_folder.setdefault(d["week_folder"], []).append(d)

    created, patched = 0, 0
    for folder, folder_deals in sorted(by_folder.items()):
        folder_deals.sort(key=suffix)
        folder_path = os.path.join(ROOT, "funding_data", folder)
        csv_path = os.path.join(folder_path, "data.csv")

        if not os.path.isdir(folder_path):
            expected = list(range(1, len(folder_deals) + 1))
            actual = [suffix(d) for d in folder_deals]
            if actual != expected:
                sys.exit(f"ABORT {folder}: non-contiguous suffixes {actual}")
            os.makedirs(folder_path)
            rows = [HEADER] + [to_csv_row(d) for d in folder_deals]
            with open(csv_path, "w") as f:
                f.write("\n".join(rows) + "\n")
            created += 1
        else:
            # The generator indexes non-empty lines: header is line 0, data row i
            # has id suffix i. Replace in place so neighbouring ids don't shift.
            lines = [l for l in open(csv_path).read().split("\n") if l.strip()]
            for d in folder_deals:
                i = suffix(d)
                if i >= len(lines):
                    sys.exit(f"ABORT {folder}: suffix {i} beyond {len(lines) - 1} rows")
                lines[i] = to_csv_row(d)
                patched += 1
            with open(csv_path, "w") as f:
                f.write("\n".join(lines) + "\n")

    print(f"restored {len(missing)} deals: {created} folders created, {patched} rows patched in place")


if __name__ == "__main__":
    main()
