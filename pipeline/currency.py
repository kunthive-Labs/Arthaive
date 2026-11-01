"""Currency normalization for extracted deal amounts."""
from __future__ import annotations

from typing import Any

USD_INR_RATE = 83.5


def normalize_amounts(extracted: dict[str, Any]) -> tuple[float, float]:
    """Return INR lakhs and USD millions, the units stored in ``deals``.

    Extractors emit base currency units (rupees or dollars). Convert here so
    entity context, duplicate checks, queued data and published deals agree.

    Returns (0, 0) when the amount is missing or the currency is unknown.
    """
    value = extracted.get("amount_value")
    currency = (extracted.get("amount_currency") or "").upper()

    if not isinstance(value, (int, float)) or value <= 0:
        return 0.0, 0.0

    if currency == "INR":
        return round(value / 1e5, 6), round(value / USD_INR_RATE / 1e6, 6)
    if currency == "USD":
        return round(value * USD_INR_RATE / 1e5, 6), round(value / 1e6, 6)
    return 0.0, 0.0
