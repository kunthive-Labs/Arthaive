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
from statistics import median
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
    _entity_context.cache_clear()


@lru_cache(maxsize=256)
def _entity_context(company: str) -> dict:
    """Known context for a canonical company, aggregated from its existing deals.

    Returns {"locations": set[str], "sectors": set[str], "stage_amounts": dict[str, tuple],
    "amounts": tuple} with strings lowercased. Any Supabase error → empty context (no boost).
    """
    empty: dict = {"locations": set(), "sectors": set(), "stage_amounts": {}, "amounts": ()}
    try:
        client = get_client()
        res = (
            client.table("deals")
            .select("location,sectors,stage,amount_inr")
            .eq("company", company)
            .order("deal_date", desc=True)
            .limit(10)
            .execute()
        )
    except Exception:
        return empty

    locations: set[str] = set()
    sectors: set[str] = set()
    stage_amounts: dict[str, list[float]] = {}
    amounts: list[float] = []
    for row in res.data or []:
        if row.get("location"):
            locations.add(row["location"].strip().lower())
        for sector in row.get("sectors") or []:
            if sector:
                sectors.add(sector.strip().lower())
        amount = row.get("amount_inr")
        if amount:
            amounts.append(float(amount))
            stage = (row.get("stage") or "").strip().lower()
            if stage:
                stage_amounts.setdefault(stage, []).append(float(amount))
    return {
        "locations": locations,
        "sectors": sectors,
        "stage_amounts": {k: tuple(v) for k, v in stage_amounts.items()},
        "amounts": tuple(amounts),
    }


def boost_score(score: float, candidate_canonical: str, extracted: dict | None) -> float:
    """Contextual boost per PHASES.md §5.1, on the 0-100 rapidfuzz scale.

    Spec is 0-1 (+0.05 city, +0.05 sector, +0.03 amount-typical) → here +5, +5, +3;
    capped at 100. Compares the extracted record's location/sectors/amount against
    the candidate entity's known context from its existing deals rows.
    """
    if not extracted or not candidate_canonical:
        return score

    ctx = _entity_context(candidate_canonical)
    boosted = score

    location = (extracted.get("location") or "").strip().lower()
    if location and location in ctx["locations"]:
        boosted += 5

    extracted_sectors = {
        s.strip().lower() for s in (extracted.get("sectors") or []) if s and s.strip()
    }
    if extracted_sectors & ctx["sectors"]:
        boosted += 5

    amount = extracted.get("amount_inr")
    if amount:
        stage = (extracted.get("stage") or "").strip().lower()
        typical = ctx["stage_amounts"].get(stage) or ctx["amounts"]
        if typical:
            mid = median(typical)
            if mid and 0.1 * mid <= float(amount) <= 10 * mid:
                boosted += 3

    return min(boosted, 100.0)


def _fuzzy_match(name: str, entity_type: EntityType) -> tuple[str | None, float]:
    index = _candidate_index(entity_type)
    if not index:
        return None, 0.0
    best = process.extractOne(name, index.keys(), scorer=fuzz.token_sort_ratio)
    if not best:
        return None, 0.0
    candidate, score, _ = best
    return index[candidate], float(score)


def resolve(
    name: str | None,
    entity_type: EntityType = "startup",
    context: dict | None = None,
) -> ResolutionResult:
    if not name or not name.strip():
        return ResolutionResult(canonical=None, suggested=None, score=0.0)

    name = name.strip()
    canonical = _exact_match(name, entity_type)
    if canonical:
        return ResolutionResult(canonical=canonical, suggested=None, score=100.0)

    suggested, score = _fuzzy_match(name, entity_type)
    if context and suggested and score < AUTO_MATCH_THRESHOLD:
        score = boost_score(score, suggested, context)
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
