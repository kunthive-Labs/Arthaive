"""Source registry and tunables for the ingestion pipeline."""
from __future__ import annotations

import os

# Slug fragments that suggest a URL might be a funding announcement.
# Coarse pre-filter only — the AI extractor is the real gate.
FUNDING_SLUG_HINTS = (
    "raise", "raises", "raised",
    "funding", "funds",
    "series", "seed", "pre-seed",
    "round",
    "mn-", "-mn", "million",
    "crore", "-cr-", "cr-",
    "secures", "secured",
    "picks-up", "picks",
    "investment", "invests", "invested",
    "snippets",
    "acquires", "acquisition", "acquired",
    "valuation",
    # broadened to catch funding-deal slugs the original set missed
    # (hyphen-anchored where the bare word risks false substring matches)
    "bags", "bagged", "-backs-", "backed-by",
    "-stake", "bets-", "grabs-",
    "just-got-funded", "gets-funded", "get-funded",
    "fundraise", "mops-up", "lands-",
)

# URL fragments to exclude even if they match a hint (earnings, regulatory news).
FUNDING_SLUG_EXCLUDE = (
    "/fintrackr/",  # quarterly/annual earnings
    "/podcasts/",
    "/videos/",
    "-revenue-",
    "-profit-",
    "-loss-",
    "-q1-", "-q2-", "-q3-", "-q4-",
    "-fy2", "-fy-",
)

SOURCES: dict[str, dict] = {
    "entrackr": {
        "name": "Entrackr",
        "sitemap_index_url": "https://entrackr.com/sitemap.xml",
        "base_url": "https://entrackr.com",
        "publisher": "Entrackr",
        "reliability_tier": "tier_1",
        # Entrackr publishes one dated sitemap per day: sitemap_YYYY-MM-DD.xml
        "sitemap_mode": "daily",
        "daily_sitemap_pattern": r"sitemap_(\d{4}-\d{2}-\d{2})\.xml$",
        # CSS selectors tried in order to extract article body
        "article_body_selectors": [
            "article",
            "[itemprop='articleBody']",
            ".article-content",
            ".post-content",
            "main",
        ],
    },
    "inc42": {
        "name": "Inc42",
        "sitemap_index_url": "https://inc42.com/sitemap_index.xml",
        "base_url": "https://inc42.com",
        "publisher": "Inc42",
        "reliability_tier": "tier_1",
        # Inc42 is WordPress/Yoast: the index lists paginated post sitemaps
        # (post-sitemap.xml, post-sitemap2.xml ... post-sitemap55.xml) that
        # collectively reach back to 2015. Each sub-sitemap's <lastmod> marks
        # its newest article, so we can pick only the ones overlapping a window.
        "sitemap_mode": "paginated",
        "paginated_sitemap_pattern": r"post-sitemap\d*\.xml$",
        "article_body_selectors": [
            "article",
            "[itemprop='articleBody']",
            ".single-article-content",
            ".entry-content",
            ".post-content",
            "main",
        ],
    },
    "yourstory": {
        "name": "YourStory",
        "sitemap_index_url": "https://yourstory.com/sitemap_index.xml",
        "base_url": "https://yourstory.com",
        "publisher": "YourStory",
        "reliability_tier": "tier_2",
        # YourStory's index lists one sitemap per ISO week: sitemap_YYYY_weekNN.xml,
        # reaching back ~2015 (plus a junk sitemap_1970_week1.xml that the walker drops).
        "sitemap_mode": "weekly",
        "weekly_sitemap_pattern": r"sitemap_(\d{4})_week(\d+)\.xml$",
        "article_body_selectors": [
            "article",
            "[itemprop='articleBody']",
            ".article-content",
            "main",
        ],
        # Pre-2015 YourStory is only reachable via the Wayback Machine (the live
        # site is Cloudflare-gated, and old WordPress URLs are /YYYY/MM/slug).
        # dump_candidates_wayback.py uses this to harvest the historical backfill.
        "wayback_host": "yourstory.com",
        "wayback_date_in_url": r"/(\d{4})/(\d{1,2})/",
    },
    "vccircle": {
        "name": "VCCircle",
        # VCCircle (founded Nov 2005) is the primary source for the 2005–2014
        # backfill. The live site has no usable sitemap and is paywalled, so we
        # harvest exclusively from the Wayback Machine via dump_candidates_wayback.py.
        # Old WordPress URLs embed the date as /YYYY/MM/DD/slug.
        "sitemap_index_url": None,
        "base_url": "https://www.vccircle.com",
        "publisher": "VCCircle",
        "reliability_tier": "tier_2",
        "sitemap_mode": "wayback",
        "wayback_host": "vccircle.com",
        "wayback_date_in_url": r"/(\d{4})/(\d{1,2})/(\d{1,2})/",
        "article_body_selectors": [
            "article",
            "[itemprop='articleBody']",
            ".entry-content",
            ".post-content",
            "main",
        ],
    },
}


def source_key_for_publisher(publisher: str) -> str | None:
    """Map a publisher display name (e.g. "Inc42") to its SOURCES key."""
    wanted = publisher.strip().lower()
    for key, cfg in SOURCES.items():
        if cfg.get("publisher", "").lower() == wanted:
            return key
    return None


# RSS feeds polled by the discovery step (Phase 3). `publisher` must map to a
# SOURCES entry via source_key_for_publisher() so the fetcher knows which
# article_body_selectors to use.
RSS_FEEDS = [
    # NOTE: entrackr.com/feed 404s (verified 2026-06-12); /rss is the live feed.
    {"url": "https://entrackr.com/rss", "publisher": "Entrackr", "tier": "tier_1"},
    {"url": "https://inc42.com/feed", "publisher": "Inc42", "tier": "tier_1"},
    {"url": "https://yourstory.com/feed", "publisher": "YourStory", "tier": "tier_2"},
]

# Funding keywords matched (case-insensitively) against RSS title/summary.
KEYWORDS = [
    "raises", "raised", "funding", "funded", "secured", "closed round",
    "series a", "series b", "series c", "series d", "series e", "series f",
    "seed round", "pre-seed", "bridge round", "debt round",
    "backed by", "led by", "co-led by",
    "crore", "million", "billion",
]

# Anthropic model for extraction. Haiku is cheap and accurate enough for this shape.
EXTRACTION_MODEL = "claude-haiku-4-5-20251001"

# Cap article body sent to the model and stored in sources.raw_text_snapshot
MAX_BODY_CHARS = 5000

# httpx defaults
HTTP_TIMEOUT_SECONDS = 20
# Identifiable User-Agent with a contact URL + email so site operators can reach
# us before reaching for a block. Overridable via env for ops/testing.
HTTP_USER_AGENT = os.environ.get(
    "PIPELINE_USER_AGENT",
    "ArthaiveBot/1.0 (+https://arthive.kunthive.in; 8harath.k@gmail.com)",
)

# --- Crawler politeness ------------------------------------------------------
# Default polite delay (seconds) between successive HTTP fetches against a host
# on the main pipeline path. Override with PIPELINE_CRAWL_DELAY (e.g. "2.0").
# Applied especially to historical backfill sweeps so we don't hammer a source.
try:
    CRAWL_DELAY_SECONDS = float(os.environ.get("PIPELINE_CRAWL_DELAY", "1.5"))
except ValueError:
    CRAWL_DELAY_SECONDS = 1.5

# Whether to honour robots.txt before fetching a URL. On by default; set
# PIPELINE_RESPECT_ROBOTS=0 to disable (e.g. for archive-only re-runs).
RESPECT_ROBOTS = os.environ.get("PIPELINE_RESPECT_ROBOTS", "1").strip().lower() not in (
    "0",
    "false",
    "no",
)

# How long to cache a parsed robots.txt per host (seconds).
ROBOTS_CACHE_TTL_SECONDS = 3600

# Wayback CDX
WAYBACK_AVAILABILITY_URL = "https://archive.org/wayback/available"
WAYBACK_TIMEOUT_SECONDS = 15

# Local SQLite cache for extractor responses (safe re-runs without re-paying for AI)
EXTRACTOR_CACHE_PATH = "pipeline/.extractor_cache.sqlite"
