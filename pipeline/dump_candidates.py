"""Dump funding-article candidates to JSONL — discovery + fetch only, NO AI / NO Supabase.

Used to gather raw material (title + lede + date) so structured extraction can be done
without calling the Anthropic API. Output is one JSON object per line:

    {"url": ..., "title": ..., "pub_date": "YYYY-MM-DD", "body": "<first N chars>"}

Usage:
    python -m pipeline.dump_candidates --since 2026-05-20 --until 2026-06-03 --out /tmp/cand.jsonl
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime
from pathlib import Path

# Load .env.local / .env if present (not required — no secrets used here).
from dotenv import load_dotenv  # noqa: E402

_ROOT = Path(__file__).resolve().parent.parent
for _env in (".env.local", ".env"):
    _p = _ROOT / _env
    if _p.exists():
        load_dotenv(_p, override=False)

from pipeline.discovery import discover_urls  # noqa: E402
from pipeline.fetcher import fetch_article  # noqa: E402


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Dump funding candidates to JSONL (no AI, no DB)")
    p.add_argument("--source", default="entrackr")
    p.add_argument("--since", required=True, help="YYYY-MM-DD inclusive lower bound")
    p.add_argument("--until", default=None, help="YYYY-MM-DD inclusive upper bound (default: no cap)")
    p.add_argument("--limit", type=int, default=None, help="Cap candidate URLs scanned")
    p.add_argument("--body-chars", type=int, default=1500, help="Chars of body to keep")
    p.add_argument("--sleep", type=float, default=0.0, help="Seconds to pause between fetches (be polite on big crawls)")
    p.add_argument("--skip-existing", action="store_true",
                   help="Skip URLs already written to funding_data/*/data.csv (cheap re-crawls)")
    p.add_argument("--out", required=True, help="Output JSONL path")
    return p.parse_args()


def _d(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def main() -> int:
    args = _parse_args()
    since = _d(args.since)
    until = _d(args.until) if args.until else None

    out_path = Path(args.out)
    written = 0
    scanned = 0
    skipped_date = 0
    skipped_existing = 0
    failed = 0

    existing_urls: set[str] = set()
    if args.skip_existing:
        from pipeline.backfill_local import _existing_source_urls
        existing_urls = _existing_source_urls()

    with out_path.open("w", encoding="utf-8") as fh:
        for cand in discover_urls(args.source, since, limit=args.limit, until=until):
            scanned += 1
            if cand.url in existing_urls:
                skipped_existing += 1
                continue
            if args.sleep:
                time.sleep(args.sleep)
            art = fetch_article(cand.url, args.source, lastmod_fallback=cand.lastmod)
            if art is None or not art.body_text:
                failed += 1
                continue
            pub = art.publication_date
            if pub is None and cand.lastmod:
                try:
                    pub = date.fromisoformat(cand.lastmod[:10])
                except ValueError:
                    pub = None
            # Apply date window on the resolved publication date when available.
            if pub is not None:
                if pub < since or (until is not None and pub > until):
                    skipped_date += 1
                    continue
            rec = {
                "url": art.url,
                "title": art.title,
                "pub_date": pub.isoformat() if pub else None,
                "fetched_via": art.fetched_via,
                "body": (art.body_text or "")[: args.body_chars],
            }
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            written += 1
            if written % 10 == 0:
                print(f"  ... {written} written ({scanned} scanned)", file=sys.stderr, flush=True)

    print(
        json.dumps(
            {
                "out": str(out_path),
                "scanned": scanned,
                "written": written,
                "skipped_existing": skipped_existing,
                "skipped_out_of_window": skipped_date,
                "fetch_failed": failed,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
