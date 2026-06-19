"""No-API backfill orchestrator: rule-extract a candidate dump, then bucket.

Reads a candidate JSONL (produced by pipeline.dump_candidates):

    {"url": ..., "title": ..., "pub_date": "YYYY-MM-DD", "body": "..."}

For each candidate it runs the free rule extractor (pipeline.rule_extractor),
attaches the publication date as the deal date, and sorts the result into:

  * resolved      — rules got company + date + (amount or stage), is_funding_event:
                    written straight to CSV, no AI needed (the clean wire-style majority).
  * needs_claude  — a funding signal is present but the rules came up short
                    (no company, or no amount/stage): Claude reads the body to finish it.
  * drop          — no funding signal at all (not worth Claude's tokens).

Outputs three files next to --out-prefix:
    <prefix>.resolved.jsonl      extractor-schema records (+ source_url), feed to write_csv
    <prefix>.needs_claude.jsonl  compact {url,title,pub_date,body} for the residual extractor
    <prefix>.stats.json          counts

Within-batch dedupe: by source URL, and by a (company, date, stage) signature so the
same round reported twice doesn't double up. Cross-source / boundary dedupe is left to
write_csv (per-folder URL dedupe) and the final merge sweep.

Usage:
    python -m pipeline.backfill_local --in /tmp/cand_inc42_2015.jsonl --out-prefix /tmp/inc42_2015
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from pipeline.rule_extractor import _FUNDING_VERBS_RE, _QUALIFIER_TOKENS, rule_extract
from pipeline.write_csv import to_usd_millions

# Slug/title funding signal for the "is this even a fundraise?" gate on needs_claude.
_ROUND_HINT_RE = re.compile(
    r"\b(seed|pre-?seed|series\s+[a-h]|bridge|debt|round|fund(?:ing|s|ed)?|"
    r"rais(?:e|es|ed)|secur(?:e|es|ed)|invest(?:s|ed|ment)|backed\s+by|led\s+by)\b",
    re.IGNORECASE,
)

# Investor-entity suffixes — a one/two-word "company" ending in these is probably
# an investor the regex mistook for the startup (e.g. "Nexus" <- Nexus Venture Partners).
_INVESTORY_SUFFIXES = {"ventures", "capital", "partners", "fund", "funds", "advisors", "holdings"}


def _company_is_clean(name: str | None) -> bool:
    """Cheap precision gate: only trust short, junk-free, non-investor names."""
    if not name:
        return False
    toks = name.split()
    if len(toks) > 2:
        return False  # descriptors weren't stripped — let Claude decide
    if name[-1] in "’‘'\"`":
        return False  # mangled capture
    low = name.lower()
    if any(t.lower() in _QUALIFIER_TOKENS for t in toks):
        return False
    if toks[-1].lower() in _INVESTORY_SUFFIXES:
        return False
    if any(ch.isdigit() for ch in name) and len(toks) == 1 and len(name) <= 3:
        return False  # bare number-ish token
    return True


def _amount_is_sane(rec: dict) -> bool:
    """Reject implausible amounts (misparsed valuations / fund sizes / wrong units)."""
    usd_m = to_usd_millions(rec.get("amount_value"), rec.get("amount_currency"))
    if usd_m is None:
        return False
    if usd_m > 1500:  # > $1.5B — almost always a misparse in these articles
        return False
    stage = (rec.get("stage") or "").lower()
    early = any(s in stage for s in ("seed", "pre-series", "angel", "bridge"))
    if early and usd_m > 60:  # an early round of >$60M is a near-certain misparse
        return False
    return True


def _coerce_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10]).isoformat()
    except ValueError:
        return None


def _signature(company: str | None, deal_date: str | None, stage: str | None) -> str | None:
    if not company or not deal_date:
        return None
    return f"{company.strip().lower()}|{deal_date[:10]}|{(stage or '').lower()}"


def classify(cand: dict) -> tuple[str, dict]:
    """Return (bucket, record). record is extractor-schema for resolved/needs_claude."""
    body = cand.get("body") or ""
    title = cand.get("title") or None
    url = cand.get("url") or ""
    pub_date = _coerce_date(cand.get("pub_date"))

    extracted = rule_extract(article_text=body, article_title=title, source_tier="tier_1")
    if pub_date:
        extracted["deal_date"] = pub_date
    extracted["source_url"] = url
    extracted["title"] = title

    has_company = bool(extracted.get("company"))
    has_amount = bool(extracted.get("amount_value")) and float(extracted.get("amount_value") or 0) > 0
    has_stage = bool(extracted.get("stage"))
    has_date = bool(extracted.get("deal_date"))

    is_event = bool(extracted.get("is_funding_event"))

    # High-precision fast path: trust rules only for clean company + sane amount + date.
    # Everything else with a funding signal is handed to Claude (the residual extractor).
    if (
        is_event
        and has_company
        and has_date
        and _company_is_clean(extracted.get("company"))
        and _amount_is_sane(extracted)
    ):
        return "resolved", extracted

    # Funding signal anywhere in title/body -> worth Claude's attention.
    haystack = f"{title or ''}\n{body}"
    funding_signal = (
        is_event
        or has_amount
        or has_stage
        or bool(_FUNDING_VERBS_RE.search(haystack))
        or bool(_ROUND_HINT_RE.search(title or ""))
    )
    if funding_signal and has_date:
        compact = {
            "url": url,
            "title": title,
            "pub_date": pub_date,
            "body": body,
        }
        return "needs_claude", compact

    return "drop", {}


def _existing_source_urls() -> set[str]:
    """All Source URLs already written into funding_data/*/data.csv."""
    import csv as _csv
    from pathlib import Path as _Path

    root = _Path(__file__).resolve().parent.parent / "funding_data"
    urls: set[str] = set()
    if not root.exists():
        return urls
    for csv_path in root.glob("*/data.csv"):
        try:
            with csv_path.open(encoding="utf-8-sig", newline="") as fh:
                for row in _csv.DictReader(fh):
                    src = (row.get("Source") or "").strip()
                    if src:
                        urls.add(src)
        except OSError:
            continue
    return urls


def run(
    candidates: Iterable[dict],
    out_prefix: str,
    *,
    dry_run: bool = False,
    skip_existing: bool = False,
) -> dict[str, Any]:
    stats = {"input": 0, "resolved": 0, "needs_claude": 0, "drop": 0, "dup": 0, "already_written": 0}
    seen_urls: set[str] = set()
    seen_sig: set[str] = set()
    existing_urls = _existing_source_urls() if skip_existing else set()

    resolved_path = Path(f"{out_prefix}.resolved.jsonl")
    needs_path = Path(f"{out_prefix}.needs_claude.jsonl")

    res_fh = None if dry_run else resolved_path.open("w", encoding="utf-8")
    need_fh = None if dry_run else needs_path.open("w", encoding="utf-8")
    try:
        for cand in candidates:
            stats["input"] += 1
            url = cand.get("url") or ""
            if url and url in seen_urls:
                stats["dup"] += 1
                continue
            if url and url in existing_urls:
                stats["already_written"] += 1
                continue
            if url:
                seen_urls.add(url)

            bucket, rec = classify(cand)
            if bucket == "resolved":
                sig = _signature(rec.get("company"), rec.get("deal_date"), rec.get("stage"))
                if sig and sig in seen_sig:
                    stats["dup"] += 1
                    continue
                if sig:
                    seen_sig.add(sig)
                stats["resolved"] += 1
                if res_fh:
                    res_fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            elif bucket == "needs_claude":
                stats["needs_claude"] += 1
                if need_fh:
                    need_fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            else:
                stats["drop"] += 1
    finally:
        if res_fh:
            res_fh.close()
        if need_fh:
            need_fh.close()

    stats["resolved_path"] = str(resolved_path)
    stats["needs_claude_path"] = str(needs_path)
    return stats


def _read_jsonl(path: str) -> Iterable[dict]:
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def main() -> int:
    ap = argparse.ArgumentParser(description="Rule-extract + bucket a candidate dump (no AI, no DB)")
    ap.add_argument("--in", dest="input", required=True, help="Candidate JSONL from dump_candidates")
    ap.add_argument("--out-prefix", required=True, help="Output prefix; writes <prefix>.resolved.jsonl etc.")
    ap.add_argument("--dry-run", action="store_true", help="Count buckets, write nothing")
    ap.add_argument("--skip-existing", action="store_true",
                    help="Drop candidates whose URL is already in funding_data/*/data.csv")
    args = ap.parse_args()
    stats = run(_read_jsonl(args.input), args.out_prefix, dry_run=args.dry_run, skip_existing=args.skip_existing)
    if not args.dry_run:
        Path(f"{args.out_prefix}.stats.json").write_text(json.dumps(stats, indent=2))
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
