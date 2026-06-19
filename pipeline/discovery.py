"""Article discovery: sitemap walker + RSS feed polling."""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Iterator

import feedparser
import httpx
from lxml import etree

from pipeline.config import (
    FUNDING_SLUG_EXCLUDE,
    FUNDING_SLUG_HINTS,
    HTTP_TIMEOUT_SECONDS,
    HTTP_USER_AGENT,
    KEYWORDS,
    RSS_FEEDS,
    SOURCES,
    source_key_for_publisher,
)

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


@dataclass
class Candidate:
    url: str
    lastmod: str | None


def _client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": HTTP_USER_AGENT},
        timeout=HTTP_TIMEOUT_SECONDS,
        follow_redirects=True,
    )


def _parse_xml(content: bytes) -> etree._Element:
    return etree.fromstring(content)


def _fetch_xml(client: httpx.Client, url: str) -> etree._Element | None:
    try:
        r = client.get(url)
        if r.status_code != 200:
            return None
        return _parse_xml(r.content)
    except (httpx.HTTPError, etree.XMLSyntaxError):
        return None


def _slug_matches(url: str) -> bool:
    lower = url.lower()
    if any(bad in lower for bad in FUNDING_SLUG_EXCLUDE):
        return False
    return any(hint in lower for hint in FUNDING_SLUG_HINTS)


def _daily_sitemaps(
    client: httpx.Client, source_key: str, since: date, until: date | None = None
) -> list[str]:
    cfg = SOURCES[source_key]
    root = _fetch_xml(client, cfg["sitemap_index_url"])
    if root is None:
        return []
    pat = re.compile(cfg["daily_sitemap_pattern"])
    out: list[tuple[date, str]] = []
    for loc in root.findall(".//sm:sitemap/sm:loc", SITEMAP_NS):
        href = (loc.text or "").strip()
        m = pat.search(href)
        if not m:
            continue
        try:
            d = datetime.strptime(m.group(1), "%Y-%m-%d").date()
        except ValueError:
            continue
        if d >= since and (until is None or d <= until):
            out.append((d, href))
    out.sort(key=lambda x: x[0], reverse=True)  # newest first
    return [h for _, h in out]


def _paginated_sitemaps(
    client: httpx.Client, source_key: str, since: date, until: date | None = None
) -> list[str]:
    """Sub-sitemaps (newest first) whose articles may fall in [`since`, `until`].

    Yoast lists one <lastmod> per sub-sitemap = the date of its newest post, and
    fills sub-sitemaps in chronological order, so sub-sitemap *i* covers roughly
    the span (lastmod[i-1], lastmod[i]]. A sub-sitemap overlaps the window when
    its newest post is on/after `since` AND its oldest post (≈ the previous
    sub-sitemap's lastmod) is on/before `until`. We also keep the single boundary
    sub-sitemap just older than `since` (lastmod may lag). The per-article date
    filter in discover_urls does the precise trimming.
    """
    cfg = SOURCES[source_key]
    root = _fetch_xml(client, cfg["sitemap_index_url"])
    if root is None:
        return []
    pat = re.compile(cfg["paginated_sitemap_pattern"])
    entries: list[tuple[date, str]] = []
    for sm in root.findall(".//sm:sitemap", SITEMAP_NS):
        loc_el = sm.find("sm:loc", SITEMAP_NS)
        if loc_el is None or not (loc_el.text or "").strip():
            continue
        href = loc_el.text.strip()
        if not pat.search(href):
            continue
        lastmod_el = sm.find("sm:lastmod", SITEMAP_NS)
        try:
            d = date.fromisoformat((lastmod_el.text or "")[:10]) if lastmod_el is not None else date.min
        except (ValueError, TypeError):
            d = date.min
        entries.append((d, href))

    entries.sort(key=lambda x: x[0])  # oldest first
    hi = until or date.max
    selected: list[tuple[date, str]] = []
    for i, (d, h) in enumerate(entries):
        prev_d = entries[i - 1][0] if i > 0 else date.min
        if d >= since and prev_d <= hi:
            selected.append((d, h))
    # Keep the boundary sub-sitemap just older than `since` (lastmod may lag).
    older = [(d, h) for (d, h) in entries if d < since]
    if older:
        selected.insert(0, older[-1])
    seen: set[str] = set()
    uniq: list[tuple[date, str]] = []
    for d, h in selected:
        if h not in seen:
            seen.add(h)
            uniq.append((d, h))
    uniq.sort(key=lambda x: x[0], reverse=True)  # newest first
    return [h for _, h in uniq]


def _iso_week_start(year: int, week: int) -> date:
    """Monday of ISO week `week` in `year` (used only to date-scope YourStory files)."""
    try:
        return date.fromisocalendar(year, week, 1)
    except ValueError:
        # Some years label a 53rd week that doesn't exist; clamp.
        return date(year, 12, 28)


def _weekly_sitemaps(
    client: httpx.Client, source_key: str, since: date, until: date | None = None
) -> list[str]:
    """YourStory weekly sub-sitemaps overlapping [`since`, `until`].

    Index entries look like sitemap_YYYY_weekNN.xml. We derive each file's week
    span from its (year, week) and keep files whose span intersects the window.
    Junk artifacts (e.g. sitemap_1970_week1.xml) fall outside any real window and
    are dropped. The per-article lastmod filter in discover_urls trims precisely.
    """
    cfg = SOURCES[source_key]
    root = _fetch_xml(client, cfg["sitemap_index_url"])
    if root is None:
        return []
    pat = re.compile(cfg["weekly_sitemap_pattern"])
    hi = until or date.max
    selected: list[tuple[date, str]] = []
    for sm in root.findall(".//sm:sitemap", SITEMAP_NS):
        loc_el = sm.find("sm:loc", SITEMAP_NS)
        if loc_el is None or not (loc_el.text or "").strip():
            continue
        href = loc_el.text.strip()
        m = pat.search(href)
        if not m:
            continue
        year, week = int(m.group(1)), int(m.group(2))
        if year < 2000 or week < 1 or week > 53:
            continue  # skip the 1970 epoch artifact and bad weeks
        wk_start = _iso_week_start(year, week)
        wk_end = wk_start + timedelta(days=6)
        if wk_end >= since and wk_start <= hi:
            selected.append((wk_start, href))
    selected.sort(key=lambda x: x[0], reverse=True)  # newest first
    return [h for _, h in selected]


def discover_urls(
    source_key: str, since: date, limit: int | None = None, until: date | None = None
) -> Iterator[Candidate]:
    """Yield Candidate(url, lastmod) for articles published in [`since`, `until`]."""
    if source_key not in SOURCES:
        raise KeyError(f"unknown source: {source_key}")

    mode = SOURCES[source_key].get("sitemap_mode", "daily")

    yielded = 0
    with _client() as client:
        if mode == "paginated":
            sitemap_urls = _paginated_sitemaps(client, source_key, since, until)
        elif mode == "weekly":
            sitemap_urls = _weekly_sitemaps(client, source_key, since, until)
        else:
            sitemap_urls = _daily_sitemaps(client, source_key, since, until)
        for sitemap_url in sitemap_urls:
            root = _fetch_xml(client, sitemap_url)
            if root is None:
                continue
            for url_el in root.findall(".//sm:url", SITEMAP_NS):
                loc_el = url_el.find("sm:loc", SITEMAP_NS)
                if loc_el is None or not (loc_el.text or "").strip():
                    continue
                url = loc_el.text.strip()
                if not _slug_matches(url):
                    continue
                lastmod_el = url_el.find("sm:lastmod", SITEMAP_NS)
                lastmod = lastmod_el.text.strip() if lastmod_el is not None and lastmod_el.text else None
                # Paginated (Inc42) / weekly (YourStory) sitemaps mix dates within
                # and across files, so pre-filter by per-URL lastmod to skip
                # out-of-window URLs before the (expensive) fetch. Daily sitemaps
                # (Entrackr) are already date-scoped per file.
                if mode in ("paginated", "weekly") and lastmod:
                    try:
                        ld = date.fromisoformat(lastmod[:10])
                        if ld < since or (until is not None and ld > until):
                            continue
                    except ValueError:
                        pass
                yield Candidate(url=url, lastmod=lastmod)
                yielded += 1
                if limit is not None and yielded >= limit:
                    return


# --- RSS discovery (Phase 3) -------------------------------------------------


@dataclass
class FeedArticle:
    url: str
    title: str | None
    summary: str | None
    published_date: date | None
    publisher: str
    tier: str
    source_key: str  # key into SOURCES, for fetcher selectors


def _entry_date(entry: feedparser.FeedParserDict) -> date | None:
    """Best-effort publication date from a feedparser entry."""
    for attr in ("published_parsed", "updated_parsed"):
        parsed = entry.get(attr)
        if parsed:
            try:
                return date(parsed.tm_year, parsed.tm_mon, parsed.tm_mday)
            except (ValueError, AttributeError):
                continue
    return None


def poll_feeds(feeds: list[dict] | None = None) -> list[FeedArticle]:
    """Fetch each RSS feed and return its entries as FeedArticle records.

    Per-feed failures (network errors, bad XML, unmapped publisher) are logged
    to stderr and skipped so one broken feed never sinks the run.
    """
    out: list[FeedArticle] = []
    with _client() as client:
        for feed in feeds if feeds is not None else RSS_FEEDS:
            publisher = feed["publisher"]
            source_key = source_key_for_publisher(publisher)
            if source_key is None:
                print(f"[discovery] no SOURCES entry for publisher {publisher!r}, skipping", file=sys.stderr)
                continue
            try:
                r = client.get(feed["url"])
                r.raise_for_status()
            except httpx.HTTPError as exc:
                print(f"[discovery] failed to fetch feed {feed['url']}: {exc}", file=sys.stderr)
                continue
            parsed = feedparser.parse(r.content)
            if parsed.bozo and not parsed.entries:
                print(f"[discovery] unparseable feed {feed['url']}: {parsed.bozo_exception}", file=sys.stderr)
                continue
            for entry in parsed.entries:
                url = (entry.get("link") or "").strip()
                if not url:
                    continue
                out.append(
                    FeedArticle(
                        url=url,
                        title=entry.get("title") or None,
                        summary=entry.get("summary") or None,
                        published_date=_entry_date(entry),
                        publisher=publisher,
                        tier=feed["tier"],
                        source_key=source_key,
                    )
                )
    return out


def keyword_filter(articles: list[FeedArticle]) -> list[FeedArticle]:
    """Keep articles whose title or summary mentions any funding KEYWORD."""
    kept: list[FeedArticle] = []
    for article in articles:
        haystack = f"{article.title or ''} {article.summary or ''}".lower()
        if any(kw in haystack for kw in KEYWORDS):
            kept.append(article)
    return kept
