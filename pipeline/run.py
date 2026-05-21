"""Orchestrator: discover → fetch → extract → write to review_queue."""
from __future__ import annotations

import argparse
import json
import sys
import time
import traceback
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv

# Load .env.local first (project convention), then .env as fallback.
_ROOT = Path(__file__).resolve().parent.parent
for env_file in (".env.local", ".env"):
    p = _ROOT / env_file
    if p.exists():
        load_dotenv(p, override=False)

from pipeline.config import SOURCES  # noqa: E402
from pipeline.discovery import discover_urls  # noqa: E402
from pipeline.fetcher import fetch_article  # noqa: E402


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Funding-news ingestion pipeline")
    p.add_argument("--source", default="entrackr", choices=sorted(SOURCES.keys()))
    p.add_argument("--since", required=True, help="YYYY-MM-DD lower bound (inclusive)")
    p.add_argument("--limit", type=int, default=None, help="Cap number of candidate URLs")
    p.add_argument("--dry-run", action="store_true", help="No DB writes, no AI calls")
    p.add_argument("--no-ai", action="store_true", help="Discover + fetch only; skip AI extraction")
    p.add_argument("--progress-every", type=int, default=25)
    return p.parse_args()


def _log(event: str, **fields) -> None:
    payload = {"ts": datetime.utcnow().isoformat(timespec="seconds"), "event": event, **fields}
    print(json.dumps(payload), file=sys.stderr, flush=True)


def main() -> int:
    args = _parse_args()
    since = date.fromisoformat(args.since)
    source_cfg = SOURCES[args.source]

    # Lazy imports so --dry-run / --no-ai don't require Anthropic / Supabase deps to be configured
    extract_deal = None
    insert_source = insert_review_item = log_job_run = is_url_seen = None
    JobStats = None
    if not args.dry_run:
        from pipeline.queue import (  # noqa: E402
            JobStats as _JobStats,
            insert_review_item as _insert_review_item,
            insert_source as _insert_source,
            log_job_run as _log_job_run,
        )
        from pipeline.dedup import is_url_seen as _is_url_seen  # noqa: E402

        JobStats = _JobStats
        insert_source = _insert_source
        insert_review_item = _insert_review_item
        log_job_run = _log_job_run
        is_url_seen = _is_url_seen

    if not args.dry_run and not args.no_ai:
        from pipeline.extractor import extract_deal as _extract_deal  # noqa: E402
        extract_deal = _extract_deal

    stats = {
        "articles_fetched": 0,
        "articles_filtered": 0,
        "records_extracted": 0,
        "records_flagged": 0,
        "records_auto_approved": 0,
        "errors": 0,
    }

    started = time.time()
    _log("run.start", source=args.source, since=args.since, limit=args.limit, dry_run=args.dry_run, no_ai=args.no_ai)

    candidates = list(discover_urls(args.source, since, args.limit))
    _log("discovery.done", candidates=len(candidates))

    run_status = "success"
    error_log_lines: list[str] = []

    try:
        for i, cand in enumerate(candidates, start=1):
            if i % args.progress_every == 0:
                _log("progress", processed=i, total=len(candidates), **stats)

            if not args.dry_run and is_url_seen and is_url_seen(cand.url):
                stats["articles_filtered"] += 1
                continue

            article = fetch_article(cand.url, args.source, lastmod_fallback=cand.lastmod)
            if article is None:
                stats["articles_filtered"] += 1
                _log("fetch.miss", url=cand.url)
                continue
            stats["articles_fetched"] += 1

            if args.dry_run:
                print(json.dumps({
                    "url": article.url,
                    "title": article.title,
                    "fetched_via": article.fetched_via,
                    "pub_date": article.publication_date.isoformat() if article.publication_date else None,
                    "body_chars": len(article.body_text),
                }))
                continue

            if args.no_ai:
                extracted = None
            else:
                try:
                    extracted = extract_deal(
                        article_text=article.body_text,
                        article_title=article.title,
                        url=article.url,
                    )
                except Exception as e:  # network/API errors
                    stats["errors"] += 1
                    error_log_lines.append(f"extract:{cand.url}:{e!r}")
                    continue

            try:
                source_id = insert_source(
                    url=article.url,
                    title=article.title,
                    publication_date=(article.publication_date.isoformat() if article.publication_date else None),
                    publisher=source_cfg["publisher"],
                    reliability_tier=source_cfg["reliability_tier"],
                    extraction_method="ai_extracted",
                    raw_text_snapshot=article.body_text,
                )
            except Exception as e:
                stats["errors"] += 1
                error_log_lines.append(f"src:{cand.url}:{e!r}")
                continue

            if extracted is None:
                stats["articles_filtered"] += 1
                continue

            try:
                insert_review_item(source_id=source_id, extracted=extracted)
                stats["records_extracted"] += 1
                stats["records_flagged"] += 1  # pending review
            except Exception as e:
                stats["errors"] += 1
                error_log_lines.append(f"rev:{cand.url}:{e!r}")

        if stats["errors"] > 0:
            run_status = "partial"
    except Exception:
        run_status = "failed"
        error_log_lines.append(traceback.format_exc())
        _log("run.error", traceback=traceback.format_exc())

    elapsed = round(time.time() - started, 1)
    _log("run.done", elapsed_s=elapsed, run_status=run_status, **stats)

    if not args.dry_run and log_job_run and JobStats:
        try:
            log_job_run(JobStats(
                source_feed=f"{args.source}_sitemap",
                articles_fetched=stats["articles_fetched"],
                articles_filtered=stats["articles_filtered"],
                records_extracted=stats["records_extracted"],
                records_auto_approved=stats["records_auto_approved"],
                records_flagged=stats["records_flagged"],
                run_status=run_status,
                error_log="\n".join(error_log_lines)[:8000] if error_log_lines else None,
            ))
        except Exception as e:
            _log("job_log.error", error=repr(e))

    return 0 if run_status != "failed" else 1


if __name__ == "__main__":
    sys.exit(main())
