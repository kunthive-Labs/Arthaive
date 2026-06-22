"""Orchestrator for the funding-news ingestion pipeline.

Modes (PHASES.md §4.7):
  --discover    poll RSS feeds, fetch new articles, store sources + pending review_queue rows
  --extract     rule-based extraction (AI fallback below 0.70 confidence) over unextracted queue items
  (no args)     discover, then extract
  --backfill    historical sitemap crawl for --source/--since with inline extraction
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from datetime import date, datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from dotenv import load_dotenv

# Load .env.local first (project convention), then .env as fallback.
_ROOT = Path(__file__).resolve().parent.parent
for env_file in (".env.local", ".env"):
    p = _ROOT / env_file
    if p.exists():
        load_dotenv(p, override=False)

from pipeline.config import SOURCES  # noqa: E402
from pipeline.discovery import discover_urls, keyword_filter, poll_feeds  # noqa: E402
from pipeline.fetcher import fetch_article  # noqa: E402

# Confidence at or above this auto-approves into the deals table (PHASES.md §4.5).
AUTO_APPROVE_CONFIDENCE = 0.80
# Below this, the rule-based extraction is handed to the AI extractor (PHASES.md §4.3).
AI_FALLBACK_THRESHOLD = 0.70

# --- Silent-failure detection ------------------------------------------------
# A run that fetched articles but errored on (almost) every one looks "partial"
# and exits green today; that hides a source-format break ("data is the
# product"). We escalate a 'partial' run to a hard failure when the error rate
# over attempted work is at or above this fraction.
ABNORMAL_ERROR_RATE = float(os.environ.get("PIPELINE_ABNORMAL_ERROR_RATE", "0.5"))
# Minimum attempted units before the error-rate gate is meaningful (avoids
# flagging a tiny run where 1 of 2 items errored as catastrophic).
MIN_ATTEMPTS_FOR_RATE = int(os.environ.get("PIPELINE_MIN_ATTEMPTS_FOR_RATE", "5"))


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Funding-news ingestion pipeline")
    p.add_argument("--discover", action="store_true", help="RSS discovery pass only")
    p.add_argument("--extract", action="store_true", help="Extraction pass over unextracted queue items only")
    p.add_argument("--backfill", action="store_true", help="Historical sitemap crawl (requires --since)")
    p.add_argument("--source", default="entrackr", choices=sorted(SOURCES.keys()), help="Backfill source")
    p.add_argument("--since", default=None, help="YYYY-MM-DD lower bound for --backfill (inclusive)")
    p.add_argument("--limit", type=int, default=None, help="Cap candidate URLs / queue items processed")
    p.add_argument("--dry-run", action="store_true", help="No DB writes, no AI calls")
    p.add_argument("--no-ai", action="store_true", help="Skip the AI fallback extractor")
    p.add_argument("--progress-every", type=int, default=25)
    args = p.parse_args()
    if args.since and not args.backfill:
        args.backfill = True
    if args.backfill and not args.since:
        p.error("--backfill requires --since YYYY-MM-DD")
    return args


def _log(event: str, **fields) -> None:
    payload = {"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"), "event": event, **fields}
    print(json.dumps(payload), file=sys.stderr, flush=True)


def _new_stats() -> dict:
    return {
        "articles_fetched": 0,
        "articles_filtered": 0,
        "records_extracted": 0,
        "records_flagged": 0,
        "records_auto_approved": 0,
        "errors": 0,
    }


def _load_db_deps() -> SimpleNamespace:
    """Lazy imports so --dry-run doesn't require Supabase to be configured."""
    from pipeline.currency import normalize_amounts
    from pipeline.dedup import find_duplicate_deal, is_url_seen
    from pipeline.entity_resolver import resolve, resolve_investors
    from pipeline.queue import (
        JobStats,
        fetch_unextracted_items,
        insert_deal,
        insert_review_item,
        insert_source,
        log_job_run,
        update_review_item,
    )

    return SimpleNamespace(
        JobStats=JobStats,
        fetch_unextracted_items=fetch_unextracted_items,
        insert_deal=insert_deal,
        insert_review_item=insert_review_item,
        insert_source=insert_source,
        log_job_run=log_job_run,
        update_review_item=update_review_item,
        find_duplicate_deal=find_duplicate_deal,
        is_url_seen=is_url_seen,
        normalize_amounts=normalize_amounts,
        resolve=resolve,
        resolve_investors=resolve_investors,
    )


def _load_ai_extractor():
    from pipeline.extractor import extract_deal
    return extract_deal


def _extract_with_fallback(
    *,
    body: str,
    title: str | None,
    url: str,
    tier: str,
    pub_date: str | None,
    ai_extract,
    stats: dict,
    error_log_lines: list[str],
) -> dict | None:
    """Rule-based extraction first; AI fallback when confidence < 0.70 or the rules
    can't tell whether it's a funding event. Returns None when the article is
    confidently NOT a funding event (AI said so)."""
    from pipeline.confidence import compute_confidence
    from pipeline.rule_extractor import rule_extract

    extracted = rule_extract(article_text=body, article_title=title, source_tier=tier)
    if pub_date and not extracted.get("deal_date"):
        extracted["deal_date"] = pub_date
        fc = dict(extracted.get("field_confidences") or {})
        fc["date"] = 1.0
        extracted["field_confidences"] = fc
        extracted["confidence"] = compute_confidence(fc, tier)

    confidence = float(extracted.get("confidence") or 0.0)
    needs_ai = confidence < AI_FALLBACK_THRESHOLD or not extracted.get("is_funding_event")

    if needs_ai and ai_extract is not None:
        try:
            ai = ai_extract(article_text=body, article_title=title, url=url)
        except Exception as e:  # network/API errors — keep the rule output
            stats["errors"] += 1
            error_log_lines.append(f"ai:{url}:{e!r}")
            return extracted
        if ai is None:
            return None  # AI verdict: not a funding event
        if pub_date and not ai.get("deal_date"):
            ai["deal_date"] = pub_date
        ai["extraction_method"] = "ai_extracted"
        ai.setdefault("is_funding_event", True)
        return ai

    return extracted


def _route_record(
    *,
    extracted: dict,
    pub_date: str | None,
    source_url: str | None,
    source_id: str | None,
    queue_id: str | None,
    stats: dict,
    deps: SimpleNamespace,
) -> None:
    """Auto-approve into deals, flag as duplicate, or leave for human review.

    queue_id set   → updates the existing review_queue row (--extract pass)
    queue_id None  → inserts a new review_queue row when flagged (--backfill inline)
    """
    stats["records_extracted"] += 1

    amount_inr, amount_usd = deps.normalize_amounts(extracted)
    extracted = {**extracted, "amount_inr": amount_inr, "amount_usd": amount_usd}

    raw_company = extracted.get("company")
    company_res = deps.resolve(raw_company, "startup", extracted) if raw_company else None
    canonical_company = company_res.canonical if company_res else None

    deal_date = extracted.get("deal_date") or pub_date

    duplicate_id = None
    if canonical_company and deal_date:
        duplicate_id = deps.find_duplicate_deal(
            company=canonical_company,
            amount_inr=amount_inr,
            deal_date=deal_date,
        )

    confidence = extracted.get("confidence")
    confidence = float(confidence) if isinstance(confidence, (int, float)) else 0.0

    can_auto_approve = (
        confidence >= AUTO_APPROVE_CONFIDENCE
        and canonical_company is not None
        and deal_date is not None
        and amount_inr > 0
        and duplicate_id is None
    )

    if can_auto_approve:
        investors_canon = deps.resolve_investors(extracted.get("investors") or [])
        lead_raw = extracted.get("lead_investor")
        lead_canon = (deps.resolve(lead_raw, "investor").canonical or lead_raw) if lead_raw else None

        deps.insert_deal(
            company=canonical_company,
            amount_inr=amount_inr,
            amount_usd=amount_usd,
            stage=extracted.get("stage") or "Undisclosed",
            sectors=extracted.get("sectors") or [],
            investors=investors_canon,
            lead_investor=lead_canon,
            deal_date=deal_date,
            location=extracted.get("location") or "India",
            description=extracted.get("notes"),
            source_url=source_url,
            source_id=source_id,
        )
        if queue_id:
            deps.update_review_item(queue_id, extracted=extracted, status="approved", notes="Auto-approved")
        stats["records_auto_approved"] += 1
        _log("deal.auto_approved", company=canonical_company, confidence=confidence)
        return

    suggested = canonical_company or (company_res.suggested if company_res else None)
    notes = f"Possible duplicate of {duplicate_id}" if duplicate_id else None
    payload = {**extracted, "suggested_company": suggested, "duplicate_of": duplicate_id}
    if company_res and suggested and not canonical_company:
        payload["match_confidence"] = round(company_res.score / 100, 2)

    if queue_id:
        deps.update_review_item(
            queue_id,
            extracted=payload,
            status="needs_more_info" if duplicate_id else None,
            notes=notes,
        )
    else:
        deps.insert_review_item(source_id=source_id, extracted={**payload, "notes": notes})
    stats["records_flagged"] += 1


def _run_discover(args, deps: SimpleNamespace | None, stats: dict, error_log_lines: list[str]) -> None:
    """RSS pass: poll feeds → keyword filter → fetch → sources + pending queue rows (PHASES.md §3)."""
    feed_articles = poll_feeds()
    kept = keyword_filter(feed_articles)
    stats["articles_filtered"] += len(feed_articles) - len(kept)
    _log("discovery.rss", entries=len(feed_articles), kept=len(kept))

    processed = 0
    for fa in kept:
        if args.limit is not None and processed >= args.limit:
            break
        processed += 1

        if deps is not None and deps.is_url_seen(fa.url):
            stats["articles_filtered"] += 1
            continue

        lastmod = fa.published_date.isoformat() if fa.published_date else None
        try:
            article = fetch_article(fa.url, fa.source_key, lastmod_fallback=lastmod)
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"fetch:{fa.url}:{e!r}")
            continue
        if article is None:
            stats["articles_filtered"] += 1
            _log("fetch.miss", url=fa.url)
            continue
        stats["articles_fetched"] += 1

        if args.dry_run:
            print(json.dumps({
                "url": article.url,
                "title": article.title,
                "publisher": fa.publisher,
                "pub_date": article.publication_date.isoformat() if article.publication_date else None,
                "body_chars": len(article.body_text),
            }))
            continue

        try:
            source_id = deps.insert_source(
                url=article.url,
                title=article.title or fa.title,
                publication_date=(article.publication_date.isoformat() if article.publication_date else lastmod),
                publisher=fa.publisher,
                reliability_tier=fa.tier,
                extraction_method="rss_auto",
                raw_text_snapshot=article.body_text,
            )
            # Empty raw_extracted_data marks the row for the --extract pass (PHASES.md §3.5).
            deps.insert_review_item(source_id=source_id, extracted={})
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"queue:{fa.url}:{e!r}")


def _run_extract(args, deps: SimpleNamespace, ai_extract, stats: dict, error_log_lines: list[str]) -> None:
    """Second pass: extract every pending queue item that has no raw_extracted_data yet."""
    items = deps.fetch_unextracted_items(limit=args.limit or 500)
    _log("extract.start", items=len(items))

    for i, item in enumerate(items, start=1):
        if i % args.progress_every == 0:
            _log("progress", processed=i, total=len(items), **stats)

        src = item.get("sources") or {}
        body = src.get("raw_text_snapshot") or ""
        if not body:
            deps.update_review_item(item["id"], status="needs_more_info", notes="No article text stored")
            continue

        pub_date = src.get("publication_date")
        try:
            extracted = _extract_with_fallback(
                body=body,
                title=src.get("title"),
                url=src.get("url") or "",
                tier=src.get("reliability_tier") or "tier_2",
                pub_date=pub_date,
                ai_extract=ai_extract,
                stats=stats,
                error_log_lines=error_log_lines,
            )
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"extract:{src.get('url')}:{e!r}")
            continue

        if extracted is None:
            deps.update_review_item(item["id"], status="rejected", notes="Not a funding event")
            continue

        if not extracted.get("is_funding_event"):
            # Rules couldn't confirm and no AI verdict — leave pending with what we have.
            deps.update_review_item(
                item["id"],
                extracted=extracted,
                notes="Rule-based extractor could not confirm funding event",
            )
            stats["records_flagged"] += 1
            continue

        try:
            _route_record(
                extracted=extracted,
                pub_date=pub_date,
                source_url=src.get("url"),
                source_id=item.get("source_id"),
                queue_id=item["id"],
                stats=stats,
                deps=deps,
            )
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"route:{src.get('url')}:{e!r}")


def _run_backfill(args, deps: SimpleNamespace | None, ai_extract, stats: dict, error_log_lines: list[str]) -> None:
    """Historical sitemap crawl with inline extraction (original POC flow)."""
    since = date.fromisoformat(args.since)
    source_cfg = SOURCES[args.source]

    candidates = list(discover_urls(args.source, since, args.limit))
    _log("discovery.done", candidates=len(candidates))

    for i, cand in enumerate(candidates, start=1):
        if i % args.progress_every == 0:
            _log("progress", processed=i, total=len(candidates), **stats)

        if deps is not None and deps.is_url_seen(cand.url):
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

        pub_date = article.publication_date.isoformat() if article.publication_date else None
        try:
            extracted = _extract_with_fallback(
                body=article.body_text,
                title=article.title,
                url=article.url,
                tier=source_cfg["reliability_tier"],
                pub_date=pub_date,
                ai_extract=ai_extract,
                stats=stats,
                error_log_lines=error_log_lines,
            )
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"extract:{cand.url}:{e!r}")
            continue

        try:
            source_id = deps.insert_source(
                url=article.url,
                title=article.title,
                publication_date=pub_date,
                publisher=source_cfg["publisher"],
                reliability_tier=source_cfg["reliability_tier"],
                extraction_method="ai_extracted",
                raw_text_snapshot=article.body_text,
            )
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"src:{cand.url}:{e!r}")
            continue

        if extracted is None or not extracted.get("is_funding_event"):
            stats["articles_filtered"] += 1
            continue

        try:
            _route_record(
                extracted=extracted,
                pub_date=pub_date,
                source_url=article.url,
                source_id=source_id,
                queue_id=None,
                stats=stats,
                deps=deps,
            )
        except Exception as e:
            stats["errors"] += 1
            error_log_lines.append(f"route:{cand.url}:{e!r}")


def _assess_run_health(run_status: str, stats: dict, *, dry_run: bool) -> tuple[str, list[str]]:
    """Decide whether a 'success'/'partial' run is actually a silent failure.

    Returns ``(effective_status, reasons)``. ``effective_status`` is escalated to
    'failed' when the data is suspect, while still distinguishing a legitimately
    quiet run ("nothing new today") from a broken one ("every extraction failed").

    Signals (any one escalates to 'failed'):
      * High error rate: ``errors`` is >= ABNORMAL_ERROR_RATE of attempted units
        (fetched articles + errors), once attempts clear MIN_ATTEMPTS_FOR_RATE.
        This catches a source-format change where extraction blows up per-item.
      * Productive-but-empty: we extracted records yet auto-approved zero AND
        errored on some — i.e. work happened but nothing landed and errors are
        implicated (a routing/format break), not a genuinely quiet day.

    A run that simply found nothing (no fetches, no errors, no records) is NOT
    escalated — that's "nothing new today" and stays green, but is annotated by
    the heartbeat note in main().
    """
    if dry_run or run_status == "failed":
        return run_status, []

    reasons: list[str] = []
    errors = stats.get("errors", 0)
    fetched = stats.get("articles_fetched", 0)
    extracted = stats.get("records_extracted", 0)
    approved = stats.get("records_auto_approved", 0)

    # Attempted units we could meaningfully error on: things we fetched plus
    # outright errors (some errors happen before a fetch counts).
    attempts = fetched + errors
    if attempts >= MIN_ATTEMPTS_FOR_RATE and errors > 0:
        rate = errors / attempts
        if rate >= ABNORMAL_ERROR_RATE:
            reasons.append(
                f"abnormal error rate {rate:.0%} ({errors}/{attempts} attempted units failed)"
            )

    # We pulled records out but none were approved AND errors were involved:
    # the pipeline did work but produced nothing usable — distinct from a quiet
    # day where extracted==0 and errors==0.
    if extracted > 0 and approved == 0 and errors > 0:
        reasons.append(
            f"extracted {extracted} record(s) but auto-approved 0 with {errors} error(s) "
            "— possible source-format break"
        )

    if reasons:
        return "failed", reasons
    return run_status, reasons


def main() -> int:
    args = _parse_args()

    deps = None if args.dry_run else _load_db_deps()
    ai_extract = None
    if not args.dry_run and not args.no_ai:
        ai_extract = _load_ai_extractor()

    stats = _new_stats()
    started = time.time()
    run_discover = args.backfill or args.discover or not args.extract
    run_extract = not args.backfill and (args.extract or not args.discover)
    _log(
        "run.start",
        backfill=args.backfill,
        discover=run_discover,
        extract=run_extract,
        source=args.source if args.backfill else "rss",
        since=args.since,
        limit=args.limit,
        dry_run=args.dry_run,
        no_ai=args.no_ai,
    )

    run_status = "success"
    error_log_lines: list[str] = []

    try:
        if args.backfill:
            _run_backfill(args, deps, ai_extract, stats, error_log_lines)
        else:
            if run_discover:
                _run_discover(args, deps, stats, error_log_lines)
            if run_extract and not args.dry_run:
                _run_extract(args, deps, ai_extract, stats, error_log_lines)

        if stats["errors"] > 0:
            run_status = "partial"
    except Exception:
        run_status = "failed"
        error_log_lines.append(traceback.format_exc())
        _log("run.error", traceback=traceback.format_exc())

    # Distinguish "nothing new today" from "every extraction failed": escalate a
    # success/partial run to a hard failure when the data looks broken. The
    # status persisted to job_runs is the *raw* status (so the dashboard still
    # shows 'partial'); the escalated status drives the exit code + alert.
    effective_status, health_reasons = _assess_run_health(run_status, stats, dry_run=args.dry_run)
    if health_reasons:
        for r in health_reasons:
            _log("run.health_alert", reason=r, raw_status=run_status)
        error_log_lines.append("HEALTH: " + "; ".join(health_reasons))

    # Freshness / heartbeat note: make a quiet run legible at a glance.
    if not args.dry_run and stats["records_auto_approved"] == 0:
        if effective_status == "failed":
            _log("run.heartbeat", note="no records approved in last run AND run flagged unhealthy")
        elif stats["records_extracted"] == 0 and stats["errors"] == 0:
            _log("run.heartbeat", note="no records approved in last run (nothing new today)")
        else:
            _log("run.heartbeat", note="no records approved in last run")

    elapsed = round(time.time() - started, 1)
    _log(
        "run.done",
        elapsed_s=elapsed,
        run_status=run_status,
        effective_status=effective_status,
        exit_code=0 if effective_status != "failed" else 1,
        **stats,
    )

    if deps is not None:
        try:
            source_feed = f"{args.source}_sitemap" if args.backfill else "rss"
            deps.log_job_run(deps.JobStats(
                source_feed=source_feed,
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

    if effective_status == "failed":
        _log("run.fail", reason="; ".join(health_reasons) or "run raised an exception")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
