"""Article fetcher with Wayback Machine fallback for dead URLs."""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import date

import httpx
from bs4 import BeautifulSoup

from pipeline.config import (
    HTTP_TIMEOUT_SECONDS,
    HTTP_USER_AGENT,
    MAX_BODY_CHARS,
    SOURCES,
)
from pipeline.politeness import is_fetch_allowed, polite_sleep
from pipeline.wayback import find_snapshot


@dataclass
class Article:
    url: str
    title: str | None
    body_text: str
    publication_date: date | None
    fetched_via: str  # 'live' | 'wayback'
    archive_url: str | None


def _fetch_html(url: str) -> tuple[int, str | None]:
    try:
        r = httpx.get(
            url,
            headers={"User-Agent": HTTP_USER_AGENT},
            timeout=HTTP_TIMEOUT_SECONDS,
            follow_redirects=True,
        )
    except httpx.HTTPError:
        return 0, None
    if r.status_code >= 400:
        return r.status_code, None
    return r.status_code, r.text


def _extract_body(html: str, selectors: list[str]) -> tuple[str | None, str]:
    soup = BeautifulSoup(html, "lxml")

    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    og = soup.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        title = og["content"].strip()

    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(separator="\n", strip=True)
            if len(text) > 200:
                return title, text[:MAX_BODY_CHARS]

    body = soup.body
    text = body.get_text(separator="\n", strip=True) if body else soup.get_text(separator="\n", strip=True)
    return title, text[:MAX_BODY_CHARS]


def _extract_publication_date(html: str) -> date | None:
    soup = BeautifulSoup(html, "lxml")
    for prop in ("article:published_time", "og:article:published_time", "datePublished"):
        m = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        if m and m.get("content"):
            try:
                return date.fromisoformat(m["content"][:10])
            except ValueError:
                continue
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text() or ""
        if "datePublished" not in raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', raw)
            if m:
                try:
                    return date.fromisoformat(m.group(1)[:10])
                except ValueError:
                    continue
            continue
        for blob in (data if isinstance(data, list) else [data]):
            if isinstance(blob, dict) and isinstance(blob.get("datePublished"), str):
                try:
                    return date.fromisoformat(blob["datePublished"][:10])
                except ValueError:
                    continue
    t = soup.find("time")
    if t and t.get("datetime"):
        try:
            return date.fromisoformat(t["datetime"][:10])
        except ValueError:
            pass
    return None


def fetch_article(url: str, source_key: str, lastmod_fallback: str | None = None) -> Article | None:
    cfg = SOURCES[source_key]
    selectors = cfg["article_body_selectors"]

    # Politeness: honour robots.txt on the live host before fetching it. A
    # disallowed path skips the live fetch (we may still read it from Wayback,
    # which is governed by archive.org's own policy, not the publisher's).
    live_allowed = is_fetch_allowed(url)
    if not live_allowed:
        print(f"[fetcher] robots.txt disallows {url}; skipping live fetch", file=sys.stderr, flush=True)

    html = None
    if live_allowed:
        polite_sleep(url)  # per-host crawl delay before hitting the source
        status, html = _fetch_html(url)
    if html is not None:
        title, body = _extract_body(html, selectors)
        if body:
            pub = _extract_publication_date(html) or _date_from_lastmod(lastmod_fallback)
            return Article(
                url=url,
                title=title,
                body_text=body,
                publication_date=pub,
                fetched_via="live",
                archive_url=None,
            )

    snap = find_snapshot(url)
    if snap is None:
        return None
    archive_url = re.sub(r"/(\d{14})/", r"/\1id_/", snap.archive_url, count=1) or snap.archive_url
    polite_sleep(archive_url)  # throttle archive.org requests too
    status2, html2 = _fetch_html(archive_url)
    if html2 is None:
        return None
    title, body = _extract_body(html2, selectors)
    if not body:
        return None
    pub = _extract_publication_date(html2) or _date_from_lastmod(lastmod_fallback) or _date_from_wayback(snap.timestamp)
    return Article(
        url=url,
        title=title,
        body_text=body,
        publication_date=pub,
        fetched_via="wayback",
        archive_url=snap.archive_url,
    )


def _date_from_lastmod(lastmod: str | None) -> date | None:
    if not lastmod:
        return None
    try:
        return date.fromisoformat(lastmod[:10])
    except ValueError:
        return None


def _date_from_wayback(ts: str) -> date | None:
    if not ts or len(ts) < 8:
        return None
    try:
        return date(int(ts[0:4]), int(ts[4:6]), int(ts[6:8]))
    except (ValueError, TypeError):
        return None
