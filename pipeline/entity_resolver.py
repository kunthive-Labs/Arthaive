"""Entity resolution against startup_aliases / investor_aliases.

Resolves a free-text company or investor name to a canonical name. Exact match
hits the alias table directly; fuzzy match scans all canonical names + aliases
with rapidfuzz.token_sort_ratio.

Score buckets (per PHASES.md §5.1):
  >= 92  → confident match, auto-canonicalize
  75-91  → possible match, attach as suggested_company for human review
  <  75  → treat as a new entity
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from rapidfuzz import fuzz, process

from pipeline.queue import get_client

EntityType = Literal["startup", "investor"]

AUTO_MATCH_THRESHOLD = 92
SUGGEST_THRESHOLD = 75


@dataclass
class ResolutionResult:
    canonical: str | None  # canonical name when score >= AUTO_MATCH_THRESHOLD
    suggested: str | None  # best candidate when SUGGEST <= score < AUTO_MATCH
    score: float           # 0-100 (rapidfuzz scale); 100 = perfect, 50 = neutral

    @property
    def is_auto(self) -> bool:
        return self.canonical is not None


def _table_for(entity_type: EntityType) -> tuple[str, str, str]:
    if entity_type == "startup":
        return "startup_aliases", "company", "alias_name"
    return "investor_aliases", "investor_name", "alias_name"


def _exact_match(name: str, entity_type: EntityType) -> str | None:
    table, canonical_col, alias_col = _table_for(entity_type)
    client = get_client()
    res = (
        client.table(table)
        .select(f"{canonical_col}")
        .eq(alias_col, name)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0][canonical_col]
    res = (
        client.table(table)
        .select(f"{canonical_col}")
        .eq(canonical_col, name)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0][canonical_col]
    return None


@lru_cache(maxsize=2)
def _candidate_index(entity_type: EntityType) -> dict[str, str]:
    """Return {candidate_string: canonical_name} for fuzzy matching."""
    table, canonical_col, alias_col = _table_for(entity_type)
    client = get_client()
    out: dict[str, str] = {}

    res = client.table(table).select(f"{canonical_col},{alias_col}").execute()
    for row in res.data or []:
        canonical = row[canonical_col]
        out[canonical] = canonical
        out[row[alias_col]] = canonical

    if entity_type == "startup":
        deals = client.table("deals").select("company").execute()
        for row in deals.data or []:
            name = row["company"]
            out.setdefault(name, name)
    else:
        inv = client.table("investors").select("name").execute()
        for row in inv.data or []:
            name = row["name"]
            out.setdefault(name, name)
    return out


def clear_index_cache() -> None:
    _candidate_index.cache_clear()


def _fuzzy_match(name: str, entity_type: EntityType) -> tuple[str | None, float]:
    index = _candidate_index(entity_type)
    if not index:
        return None, 0.0
    best = process.extractOne(name, index.keys(), scorer=fuzz.token_sort_ratio)
    if not best:
        return None, 0.0
    candidate, score, _ = best
    return index[candidate], float(score)


def resolve(name: str | None, entity_type: EntityType = "startup") -> ResolutionResult:
    if not name or not name.strip():
        return ResolutionResult(canonical=None, suggested=None, score=0.0)

    name = name.strip()
    canonical = _exact_match(name, entity_type)
    if canonical:
        return ResolutionResult(canonical=canonical, suggested=None, score=100.0)

    suggested, score = _fuzzy_match(name, entity_type)
    if score >= AUTO_MATCH_THRESHOLD:
        return ResolutionResult(canonical=suggested, suggested=None, score=score)
    if score >= SUGGEST_THRESHOLD:
        return ResolutionResult(canonical=None, suggested=suggested, score=score)
    return ResolutionResult(canonical=None, suggested=None, score=score)


def resolve_investors(names: list[str]) -> list[str]:
    """Canonicalize an investor list. Names with no high-confidence match pass through."""
    out: list[str] = []
    for raw in names or []:
        result = resolve(raw, "investor")
        out.append(result.canonical or raw)
    return out
