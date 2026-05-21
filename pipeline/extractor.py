"""Claude Haiku-based funding-event extractor with on-disk response cache."""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from typing import Any

from anthropic import Anthropic

from pipeline.config import EXTRACTION_MODEL, EXTRACTOR_CACHE_PATH

_SCHEMA_HINT = """{
  "is_funding_event": boolean,        // false if this article isn't announcing a fundraise / round / acquisition with money
  "company": string|null,             // the startup that received the funding
  "amount_raw": string|null,          // verbatim as written, e.g. "$50 million" or "Rs 40 crore" or "undisclosed"
  "amount_value": number|null,        // numeric value parsed from amount_raw, in the unit of amount_currency
  "amount_currency": "USD"|"INR"|"OTHER"|null,
  "stage": string|null,               // e.g. "Seed", "Pre-Series A", "Series B", "Bridge", "Debt", "Acquisition"
  "sectors": string[],                // e.g. ["fintech","lending"]
  "investors": string[],              // every named investor in the round
  "lead_investor": string|null,
  "deal_date": string|null,           // YYYY-MM-DD if the article gives one; null if only "this week" / vague
  "location": string|null,            // city, India
  "notes": string|null,               // short free-text — anything unusual a reviewer should know
  "confidence": number                // 0..1 self-rating of how clear the extraction was
}"""

_PROMPT = f"""You read Indian startup funding news and extract structured deal data.

Read the article below and respond with ONLY a JSON object matching this schema (no preamble, no markdown fence):

{_SCHEMA_HINT}

Rules:
- If the article is NOT an announcement of a funding round, fundraise, or M&A acquisition with an amount, set is_funding_event=false and leave other fields null/empty. Examples that are NOT funding events: quarterly earnings, regulatory approvals, hires, product launches, layoffs, opinion pieces.
- For amount_value: if amount_raw is "Rs 40 crore", amount_value=400000000 amount_currency="INR". If "$50 million", amount_value=50000000 amount_currency="USD". If undisclosed, leave both null.
- Always include the source URL's company in `company` if the article is about a single startup raising — never leave it null for a real funding event.
- Be conservative with confidence: 0.9+ only when company, amount, and at least one investor are unambiguously stated.

ARTICLE URL: {{url}}
ARTICLE TITLE: {{title}}

ARTICLE BODY:
{{body}}
"""


def _cache_init() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(EXTRACTOR_CACHE_PATH) or ".", exist_ok=True)
    con = sqlite3.connect(EXTRACTOR_CACHE_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS extractions ("
        "url_hash TEXT PRIMARY KEY, "
        "url TEXT, "
        "response_json TEXT, "
        "created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    con.commit()
    return con


def _cache_key(url: str, body: str) -> str:
    h = hashlib.sha256()
    h.update(url.encode())
    h.update(b"\x00")
    h.update(body.encode())
    return h.hexdigest()


def _cache_get(con: sqlite3.Connection, key: str) -> dict | None:
    row = con.execute("SELECT response_json FROM extractions WHERE url_hash = ?", (key,)).fetchone()
    if not row:
        return None
    try:
        return json.loads(row[0])
    except json.JSONDecodeError:
        return None


def _cache_put(con: sqlite3.Connection, key: str, url: str, data: dict) -> None:
    con.execute(
        "INSERT OR REPLACE INTO extractions (url_hash, url, response_json) VALUES (?, ?, ?)",
        (key, url, json.dumps(data)),
    )
    con.commit()


def _parse_json_strict(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None


def extract_deal(
    *,
    article_text: str,
    article_title: str | None,
    url: str,
    client: Anthropic | None = None,
    use_cache: bool = True,
) -> dict[str, Any] | None:
    """Return extracted deal dict, or None if the article is not a funding event."""
    con = _cache_init() if use_cache else None
    key = _cache_key(url, article_text)

    if con is not None:
        cached = _cache_get(con, key)
        if cached is not None:
            return None if not cached.get("is_funding_event") else cached

    if client is None:
        client = Anthropic()

    prompt = _PROMPT.format(
        url=url,
        title=article_title or "(no title)",
        body=article_text,
    )

    response_text: str | None = None
    for attempt in range(2):
        msg = client.messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = "".join(
            getattr(block, "text", "") for block in msg.content if getattr(block, "type", "") == "text"
        )
        data = _parse_json_strict(response_text)
        if data is not None:
            if con is not None:
                _cache_put(con, key, url, data)
            return None if not data.get("is_funding_event") else data

    failure = {"is_funding_event": False, "_parse_failure": True, "_raw": (response_text or "")[:500]}
    if con is not None:
        _cache_put(con, key, url, failure)
    return None
