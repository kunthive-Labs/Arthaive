"""Currency normalization for extracted deal amounts."""
from __future__ import annotations

from typing import Any

USD_INR_RATE = 83.5


def normalize_amounts(extracted: dict[str, Any]) -> tuple[float, float]:
    """Return (amount_inr, amount_usd) from the extractor's amount_value + amount_currency.

    Returns (0, 0) when the amount is missing or the currency is unknown.
    """
    value = extracted.get("amount_value")
    currency = (extracted.get("amount_currency") or "").upper()

    if not isinstance(value, (int, float)) or value <= 0:
        return 0.0, 0.0

    if currency == "INR":
        return float(value), round(value / USD_INR_RATE, 2)
    if currency == "USD":
        return round(value * USD_INR_RATE, 2), float(value)
    return 0.0, 0.0
