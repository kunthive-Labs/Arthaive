"""URL-level dedup against the `sources` table."""
from __future__ import annotations

from pipeline.queue import get_client


def is_url_seen(url: str) -> bool:
    client = get_client()
    res = (
        client.table("sources")
        .select("id", count="exact")
        .eq("url", url)
        .limit(1)
        .execute()
    )
    return bool(res.data)
