"""Weighted confidence scorer for extracted funding records (PHASES.md 4.2)."""
from __future__ import annotations

WEIGHTS = {
    "source_tier": 0.25,   # tier_1=1.0, tier_2=0.7, tier_3=0.4
    "amount": 0.20,
    "round_type": 0.15,
    "startup_name": 0.20,
    "date": 0.10,
    "investors": 0.10,
}

TIER_SCORES = {"tier_1": 1.0, "tier_2": 0.7, "tier_3": 0.4}


def compute_confidence(field_confidences: dict[str, float], source_tier: str) -> float:
    """Weighted sum of per-field confidences plus the source-tier prior.

    source_tier contributes TIER_SCORES[source_tier] * WEIGHTS["source_tier"];
    each other field contributes its 0-1 confidence * its weight.
    Missing fields count as 0. Returns 0..1 rounded to 2 decimals.
    """
    score = TIER_SCORES.get(source_tier, 0.0) * WEIGHTS["source_tier"]
    for field, weight in WEIGHTS.items():
        if field == "source_tier":
            continue
        raw = field_confidences.get(field, 0.0)
        try:
            value = float(raw)
        except (TypeError, ValueError):
            value = 0.0
        score += max(0.0, min(1.0, value)) * weight
    return round(max(0.0, min(1.0, score)), 2)
