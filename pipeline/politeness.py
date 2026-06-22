"""Crawler politeness helpers: robots.txt checking + a per-host rate limiter.

Centralises the two things every fetch path must respect:

  * ``is_fetch_allowed(url)`` — consult the host's robots.txt (cached) with our
    real User-Agent and return False for disallowed paths so callers can skip
    them rather than hammering a forbidden URL.
  * ``polite_sleep(url)`` — sleep the configured crawl delay since the last
    request to the *same host*, so bursts against one source are throttled
    while unrelated hosts aren't penalised.

Both are deliberately defensive: any error fetching/parsing robots.txt is
treated as "allowed" (fail-open) so a flaky robots endpoint never silently
zeroes out a run — that failure mode is what the run.py alerting guards.
"""
from __future__ import annotations

import sys
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

from pipeline.config import (
    CRAWL_DELAY_SECONDS,
    HTTP_USER_AGENT,
    RESPECT_ROBOTS,
    ROBOTS_CACHE_TTL_SECONDS,
)

# host -> (RobotFileParser | None, fetched_at_monotonic). None parser means the
# robots.txt could not be read; we fail open (allow) for that host.
_robots_cache: dict[str, tuple[RobotFileParser | None, float]] = {}

# host -> monotonic timestamp of the last request, for per-host rate limiting.
_last_request_at: dict[str, float] = {}


def _host_of(url: str) -> str:
    return urlsplit(url).netloc.lower()


def _robots_url(url: str) -> str:
    parts = urlsplit(url)
    scheme = parts.scheme or "https"
    return f"{scheme}://{parts.netloc}/robots.txt"


def _load_robots(url: str) -> RobotFileParser | None:
    """Fetch + parse robots.txt for the URL's host. Returns None on any failure
    (caller treats None as 'allowed')."""
    rp = RobotFileParser()
    rp.set_url(_robots_url(url))
    try:
        rp.read()
    except Exception as exc:  # network error, timeout, malformed content
        print(
            f"[politeness] could not read robots.txt for {_host_of(url)}: {exc!r} (failing open)",
            file=sys.stderr,
            flush=True,
        )
        return None
    return rp


def _get_robots(url: str) -> RobotFileParser | None:
    host = _host_of(url)
    cached = _robots_cache.get(host)
    now = time.monotonic()
    if cached is not None and (now - cached[1]) < ROBOTS_CACHE_TTL_SECONDS:
        return cached[0]
    rp = _load_robots(url)
    _robots_cache[host] = (rp, now)
    return rp


def is_fetch_allowed(url: str, user_agent: str = HTTP_USER_AGENT) -> bool:
    """True if robots.txt permits ``user_agent`` to fetch ``url``.

    Fail-open: if robots checking is disabled, or robots.txt can't be read, or
    the URL has no host, we allow the fetch. A *successfully parsed* robots.txt
    that disallows the path is the only thing that returns False.
    """
    if not RESPECT_ROBOTS:
        return True
    if not _host_of(url):
        return True
    rp = _get_robots(url)
    if rp is None:
        return True
    try:
        return rp.can_fetch(user_agent, url)
    except Exception:
        return True


def polite_sleep(url: str, delay: float = CRAWL_DELAY_SECONDS) -> None:
    """Sleep so that at least ``delay`` seconds separate requests to this host."""
    if delay <= 0:
        return
    host = _host_of(url)
    now = time.monotonic()
    last = _last_request_at.get(host)
    if last is not None:
        elapsed = now - last
        if elapsed < delay:
            time.sleep(delay - elapsed)
    _last_request_at[host] = time.monotonic()


def reset_state() -> None:
    """Clear caches — used by tests."""
    _robots_cache.clear()
    _last_request_at.clear()
