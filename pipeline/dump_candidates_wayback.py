"""Dump funding-article candidates from the Wayback Machine — for the pre-2015 backfill.

The live-sitemap crawler (`dump_candidates.py`) cannot reach 2005–2014: Inc42 and
Entrackr did not exist yet, and YourStory's live site is Cloudflare-gated. The
content does survive in the Internet Archive, so this sibling harvester enumerates
archived URLs via the Wayback CDX API and fetches the archived HTML.

It emits the EXACT same JSONL schema as dump_candidates.py, so every downstream
stage (backfill_local → chunking → agent extraction → write_csv) is unchanged:

    {"url": ..., "title": ..., "pub_date": "YYYY-MM-DD", "fetched_via": "wayback", "body": "<first N chars>"}

Both supported sources embed the publication date in the URL path
(VCCircle: /YYYY/MM/DD/slug, YourStory: /YYYY/MM/slug), so we query CDX per-year by
URL *prefix* — this keys on publication date, not capture date, avoiding the
"published 2010, archived 2014" mismatch a date-windowed CDX query would suffer.

Usage:
    python -m pipeline.dump_candidates_wayback --source vccircle \\
        --since 2010-01-01 --until 2010-12-31 --out /tmp/backfill/cand_vccircle_2010.jsonl
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv  # noqa: E402

_ROOT = Path(__file__).resolve().parent.parent
for _env in (".env.local", ".env"):
    _p = _ROOT / _env
    if _p.exists():
        load_dotenv(_p, override=False)

from pipeline.config import (  # noqa: E402
    HTTP_TIMEOUT_SECONDS,
    HTTP_USER_AGENT,
    SOURCES,
)
from pipeline.discovery import _slug_matches  # noqa: E402  (reuse funding-slug gate)
from pipeline.fetcher import _extract_body, _extract_publication_date  # noqa: E402
from pipeline.politeness import polite_sleep  # noqa: E402

CDX_URL = "http://web.archive.org/cdx/search/cdx"
# CDX index scans can take several seconds; give them far more headroom than the
# per-article fetch timeout (a full-domain regex scan would time out at 20s).
CDX_TIMEOUT_SECONDS = 60.0

# URL fragments that are never article bodies (feeds, comment threads, pagination,
# tag/category indexes). Dropped on top of the funding-slug gate.
_NOISE_FRAGMENTS = ("/feed/", "/feed", "/comment", "/page/", "/tag/", "/category/", "/author/")


def _d(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _cdx_prefix(client: httpx.Client, prefix: str, limit: int | None) -> list[tuple[str, str]]:
    """One CDX prefix query → (original_url, timestamp) rows, one per distinct URL.

    matchType=prefix is indexed and fast, unlike a full-domain regex scan (which
    read-times-out). The prefix is a date-path stem like `vccircle.com/2008/06`,
    so it matches only that month's /YYYY/MM/DD/ articles — not the modern
    dateless /YYYY-slug URLs that share the bare-year prefix.
    """
    params = {
        "url": prefix,
        "matchType": "prefix",
        "collapse": "urlkey",
        "fl": "original,timestamp",
        "filter": ["statuscode:200"],
        "output": "text",
    }
    if limit is not None:
        params["limit"] = str(limit)
    try:
        polite_sleep(CDX_URL)
        r = client.get(CDX_URL, params=params, timeout=CDX_TIMEOUT_SECONDS)
        if r.status_code != 200:
            print(f"[wayback] CDX {prefix} -> HTTP {r.status_code}", file=sys.stderr, flush=True)
            return []
    except httpx.HTTPError as exc:
        print(f"[wayback] CDX {prefix} failed: {exc!r}", file=sys.stderr, flush=True)
        return []
    out: list[tuple[str, str]] = []
    for line in r.text.splitlines():
        parts = line.split()
        if len(parts) >= 2:
            out.append((parts[0], parts[1]))
    return out


def _cdx_year(client: httpx.Client, host: str, year: int, limit: int | None) -> list[tuple[str, str]]:
    """Aggregate a year's archived date-path articles via 12 fast per-month prefix
    queries (`host/YYYY/MM`). Selecting by the date in the URL path keys on
    publication date, independent of when the page was captured. `limit` caps
    rows per month (used for smoke tests)."""
    rows: list[tuple[str, str]] = []
    for month in range(1, 13):
        prefix = f"{host}/{year}/{month:02d}"
        rows.extend(_cdx_prefix(client, prefix, limit))
    return rows


def _pub_date_from_url(url: str, pattern: re.Pattern[str]) -> date | None:
    """Extract publication date from the date-in-URL path (/YYYY/MM[/DD]/)."""
    m = pattern.search(url)
    if not m:
        return None
    g = m.groups()
    try:
        year = int(g[0])
        month = int(g[1]) if len(g) > 1 and g[1] else 1
        day = int(g[2]) if len(g) > 2 and g[2] else 1
        return date(year, month, day)
    except (ValueError, IndexError):
        return None


def _archived_html_url(timestamp: str, original_url: str) -> str:
    """Raw archived HTML (the `id_` modifier strips the Wayback navigation banner)."""
    return f"http://web.archive.org/web/{timestamp}id_/{original_url}"


def _fetch_html(client: httpx.Client, url: str) -> str | None:
    try:
        polite_sleep(url)
        r = client.get(url)
    except httpx.HTTPError:
        return None
    if r.status_code >= 400:
        return None
    return r.text


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Dump funding candidates from the Wayback Machine")
    p.add_argument("--source", required=True, choices=["vccircle", "yourstory"])
    p.add_argument("--since", required=True, help="YYYY-MM-DD inclusive lower bound")
    p.add_argument("--until", required=True, help="YYYY-MM-DD inclusive upper bound")
    p.add_argument("--limit", type=int, default=None, help="Cap CDX rows scanned per year")
    p.add_argument("--body-chars", type=int, default=1500, help="Chars of body to keep")
    p.add_argument("--skip-existing", action="store_true",
                   help="Skip URLs already written to funding_data/*/data.csv")
    p.add_argument("--out", required=True, help="Output JSONL path")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    since, until = _d(args.since), _d(args.until)
    cfg = SOURCES[args.source]
    if cfg.get("sitemap_mode") != "wayback" and "wayback_host" not in cfg:
        print(f"[wayback] source {args.source} has no wayback config", file=sys.stderr)
        return 2
    host = cfg["wayback_host"]
    date_pat = re.compile(cfg["wayback_date_in_url"])
    selectors = cfg["article_body_selectors"]

    existing_urls: set[str] = set()
    if args.skip_existing:
        from pipeline.backfill_local import _existing_source_urls
        existing_urls = _existing_source_urls()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    scanned = written = skipped_slug = skipped_date = skipped_existing = skipped_dup = failed = 0
    seen_norm: set[str] = set()

    with httpx.Client(
        headers={"User-Agent": HTTP_USER_AGENT},
        timeout=HTTP_TIMEOUT_SECONDS,
        follow_redirects=True,
    ) as client, out_path.open("w", encoding="utf-8") as fh:
        for year in range(since.year, until.year + 1):
            rows = _cdx_year(client, host, year, args.limit)
            print(f"[wayback] {host}/{year}: {len(rows)} CDX rows", file=sys.stderr, flush=True)
            for original_url, timestamp in rows:
                scanned += 1
                low = original_url.lower()
                if any(frag in low for frag in _NOISE_FRAGMENTS):
                    continue
                if not _slug_matches(original_url):
                    skipped_slug += 1
                    continue
                # Normalise (drop scheme/www/:port/trailing slash) for cross-capture dedup.
                norm = re.sub(r"^https?://(www\.)?", "", original_url).rstrip("/").split("?")[0]
                norm = re.sub(r":80(/|$)", r"\1", norm)
                if norm in seen_norm or original_url in existing_urls:
                    skipped_existing += original_url in existing_urls
                    skipped_dup += norm in seen_norm
                    continue
                seen_norm.add(norm)

                pub = _pub_date_from_url(original_url, date_pat)
                if pub is not None and (pub < since or pub > until):
                    skipped_date += 1
                    continue

                html = _fetch_html(client, _archived_html_url(timestamp, original_url))
                if html is None:
                    failed += 1
                    continue
                title, body = _extract_body(html, selectors)
                if not body:
                    failed += 1
                    continue
                # URL-derived date is authoritative for these sites; fall back to
                # the article's own metadata only when the URL had no date.
                if pub is None:
                    pub = _extract_publication_date(html)
                    if pub is not None and (pub < since or pub > until):
                        skipped_date += 1
                        continue

                rec = {
                    "url": original_url,
                    "title": title,
                    "pub_date": pub.isoformat() if pub else None,
                    "fetched_via": "wayback",
                    "body": (body or "")[: args.body_chars],
                }
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                written += 1
                if written % 10 == 0:
                    print(f"  ... {written} written ({scanned} scanned)", file=sys.stderr, flush=True)

    print(
        json.dumps(
            {
                "source": args.source,
                "out": str(out_path),
                "scanned": scanned,
                "written": written,
                "skipped_slug": skipped_slug,
                "skipped_out_of_window": skipped_date,
                "skipped_existing": skipped_existing,
                "skipped_dup": skipped_dup,
                "fetch_failed": failed,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
