"""Supabase write helpers: sources, review_queue, deals, pipeline_jobs."""
from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from typing import Any

from supabase import Client, create_client


@dataclass
class JobStats:
    source_feed: str
    articles_fetched: int = 0
    articles_filtered: int = 0
    records_extracted: int = 0
    records_auto_approved: int = 0
    records_flagged: int = 0
    run_status: str = "success"  # 'success' | 'partial' | 'failed'
    error_log: str | None = None


_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is not None:
        return _client
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    _client = create_client(url, key)
    return _client


def insert_source(
    *,
    url: str,
    title: str | None,
    publication_date: str | None,
    publisher: str,
    reliability_tier: str,
    extraction_method: str,
    raw_text_snapshot: str | None,
) -> str | None:
    """Insert into `sources` (idempotent on url). Returns source id."""
    client = get_client()
    payload = {
        "source_type": "news_article",
        "title": title,
        "url": url,
        "publication_date": publication_date,
        "publisher": publisher,
        "reliability_tier": reliability_tier,
        "extraction_method": extraction_method,
        "raw_text_snapshot": raw_text_snapshot,
    }
    res = (
        client.table("sources")
        .upsert(payload, on_conflict="url")
        .execute()
    )
    if not res.data:
        return None
    return res.data[0]["id"]


def insert_review_item(
    *,
    source_id: str | None,
    extracted: dict[str, Any],
) -> str | None:
    client = get_client()
    suggested_company = extracted.get("suggested_company") or extracted.get("company")
    confidence = extracted.get("confidence")
    payload = {
        "source_id": source_id,
        "raw_extracted_data": extracted,
        "suggested_company": suggested_company,
        "match_confidence": float(confidence) if isinstance(confidence, (int, float)) else None,
        "status": "pending",
        "notes": extracted.get("notes"),
    }
    res = client.table("review_queue").insert(payload).execute()
    if not res.data:
        return None
    return res.data[0]["id"]


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    return _SLUG_RE.sub("-", value.lower()).strip("-") or "deal"


def _deal_id(company: str, deal_date: str, source_url: str | None) -> str:
    slug = _slugify(company)[:40]
    date_part = (deal_date or "").replace("-", "")[:8] or "unknown"
    h = hashlib.sha1((source_url or company).encode()).hexdigest()[:6]
    return f"{slug}-{date_part}-{h}"


def insert_deal(
    *,
    company: str,
    amount_inr: float,
    amount_usd: float,
    stage: str,
    sectors: list[str],
    investors: list[str],
    lead_investor: str | None,
    deal_date: str,
    location: str,
    description: str | None,
    source_url: str | None,
    source_id: str | None,
) -> str | None:
    """Insert a verified deal row. Returns the deal id, or None on failure."""
    client = get_client()
    deal_id = _deal_id(company, deal_date, source_url)
    payload = {
        "id": deal_id,
        "company": company,
        "amount_inr": amount_inr,
        "amount_usd": amount_usd,
        "stage": stage or "Undisclosed",
        "sectors": sectors or [],
        "investors": investors or [],
        "lead_investor": lead_investor,
        "deal_date": deal_date,
        "location": location or "India",
        "description": description,
        "source_url": source_url,
        "source_id": source_id,
        "record_status": "verified",
    }
    res = client.table("deals").upsert(payload, on_conflict="id").execute()
    if not res.data:
        return None
    return res.data[0]["id"]


def fetch_unextracted_items(limit: int = 500) -> list[dict[str, Any]]:
    """Pending review_queue rows whose raw_extracted_data is still empty, with their source row."""
    client = get_client()
    res = (
        client.table("review_queue")
        .select(
            "id, source_id, "
            "sources(url, title, publication_date, publisher, reliability_tier, raw_text_snapshot)"
        )
        .eq("status", "pending")
        .filter("raw_extracted_data", "eq", "{}")
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return res.data or []


def update_review_item(
    item_id: str,
    *,
    extracted: dict[str, Any] | None = None,
    status: str | None = None,
    notes: str | None = None,
) -> None:
    """Update an existing review_queue row after an extraction pass."""
    client = get_client()
    payload: dict[str, Any] = {}
    if extracted is not None:
        payload["raw_extracted_data"] = extracted
        suggested = extracted.get("suggested_company") or extracted.get("company")
        if suggested:
            payload["suggested_company"] = suggested
        conf = extracted.get("match_confidence", extracted.get("confidence"))
        if isinstance(conf, (int, float)) and 0 <= conf <= 1:
            payload["match_confidence"] = float(conf)
    if status is not None:
        payload["status"] = status
    if notes is not None:
        payload["notes"] = notes
    if payload:
        client.table("review_queue").update(payload).eq("id", item_id).execute()


def log_job_run(stats: JobStats) -> None:
    client = get_client()
    payload = {
        "source_feed": stats.source_feed,
        "articles_fetched": stats.articles_fetched,
        "articles_filtered": stats.articles_filtered,
        "records_extracted": stats.records_extracted,
        "records_auto_approved": stats.records_auto_approved,
        "records_flagged": stats.records_flagged,
        "run_status": stats.run_status,
        "error_log": stats.error_log,
    }
    client.table("pipeline_jobs").insert(payload).execute()
