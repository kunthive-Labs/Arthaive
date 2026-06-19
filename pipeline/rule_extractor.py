"""Rule-based (regex/keyword) funding-data extractor (PHASES.md 4.1).

Pure stdlib. Output of rule_extract() is shape-compatible with the JSON
produced by pipeline.extractor.extract_deal (see _SCHEMA_HINT there).
"""
from __future__ import annotations

import re
from typing import Any

from pipeline.confidence import compute_confidence

# ---------------------------------------------------------------------------
# Amount extraction
# ---------------------------------------------------------------------------

_FUNDING_VERBS_RE = re.compile(
    r"\b(?:rais(?:e|es|ed|ing)|secur(?:e|es|ed)|bag(?:s|ged)?|clos(?:e|es|ed)"
    r"|land(?:s|ed)?|picks?\s+up|picked\s+up|nets?|mop(?:s|ped)\s+up)\b",
    re.IGNORECASE,
)

_UNIT_MULTIPLIERS = {
    "million": 1e6, "mn": 1e6, "m": 1e6,
    "billion": 1e9, "bn": 1e9, "b": 1e9,
    "crore": 1e7, "crores": 1e7, "cr": 1e7,
    "lakh": 1e5, "lakhs": 1e5,
}

# $50 million / $200 Mn / $1.2 Bn / $50M
_USD_RE = re.compile(
    r"(?:\$|USD\s*)\s*([\d,]+(?:\.\d+)?)\s*(million|billion|mn|bn|m|b)\b",
    re.IGNORECASE,
)
# Rs 100 crore / INR 40 Cr / ₹25 lakh
_INR_RE = re.compile(
    r"(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d+)?)\s*(crores?|cr|lakhs?)\b",
    re.IGNORECASE,
)
# bare "X crore" (no Rs/INR prefix) — only trusted near a funding verb
_BARE_CRORE_RE = re.compile(r"\b([\d,]+(?:\.\d+)?)\s*(crores?)\b", re.IGNORECASE)

_NEAR_VERB_WINDOW = 80  # chars on either side of the amount


def _parse_number(num: str) -> float | None:
    try:
        return float(num.replace(",", ""))
    except ValueError:
        return None


def _amount_candidates(text: str, in_title: bool) -> list[dict]:
    """Collect amount candidates with positions from a chunk of text."""
    candidates: list[dict] = []
    taken_spans: list[tuple[int, int]] = []
    verb_positions = [m.start() for m in _FUNDING_VERBS_RE.finditer(text)]

    def near_verb(pos: int) -> bool:
        return any(abs(pos - v) <= _NEAR_VERB_WINDOW for v in verb_positions)

    for regex, currency in ((_USD_RE, "USD"), (_INR_RE, "INR")):
        for m in regex.finditer(text):
            value = _parse_number(m.group(1))
            if value is None:
                continue
            unit = m.group(2).lower()
            candidates.append({
                "raw": m.group(0).strip(),
                "value": value * _UNIT_MULTIPLIERS.get(unit, 1.0),
                "currency": currency,
                "pos": m.start(),
                "in_title": in_title,
                "near_verb": in_title or near_verb(m.start()),
            })
            taken_spans.append(m.span())

    # Bare "X crore" only counts when near a funding verb (or in the title)
    # and not already covered by an Rs/INR match.
    for m in _BARE_CRORE_RE.finditer(text):
        if any(s <= m.start() and m.end() <= e for s, e in taken_spans):
            continue
        if not (in_title or near_verb(m.start())):
            continue
        value = _parse_number(m.group(1))
        if value is None:
            continue
        candidates.append({
            "raw": m.group(0).strip(),
            "value": value * 1e7,
            "currency": "INR",
            "pos": m.start(),
            "in_title": in_title,
            "near_verb": True,
        })
    return candidates


def extract_amount(text: str, title: str | None = None) -> dict[str, Any]:
    """Extract the funding amount. amount_value is in base units of the currency
    (Rs 40 crore -> 400000000 INR; $50 million -> 50000000 USD)."""
    candidates: list[dict] = []
    if title:
        candidates.extend(_amount_candidates(title, in_title=True))
    candidates.extend(_amount_candidates(text or "", in_title=False))

    if not candidates:
        return {"amount_raw": None, "amount_value": None,
                "amount_currency": None, "confidence": 0.0}

    # Prefer: title match > near a funding verb > first occurrence.
    best = sorted(
        candidates,
        key=lambda c: (not c["in_title"], not c["near_verb"], c["pos"]),
    )[0]

    distinct = {(c["value"], c["currency"]) for c in candidates}
    confidence = 0.9 if len(distinct) == 1 else 0.6
    return {
        "amount_raw": best["raw"],
        "amount_value": best["value"],
        "amount_currency": best["currency"],
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Round type
# ---------------------------------------------------------------------------

# Most-specific first: "Pre-Series A" must beat "Series A", "Pre-Seed" beats "Seed".
_ROUND_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("Pre-Series A", re.compile(r"\bpre[\s-]?series\s+a\b", re.IGNORECASE)),
    ("Series A", re.compile(r"\bseries\s+a\b", re.IGNORECASE)),
    ("Series B", re.compile(r"\bseries\s+b\b", re.IGNORECASE)),
    ("Series C", re.compile(r"\bseries\s+c\b", re.IGNORECASE)),
    ("Series D", re.compile(r"\bseries\s+d\b", re.IGNORECASE)),
    ("Series E", re.compile(r"\bseries\s+e\b", re.IGNORECASE)),
    ("Series F", re.compile(r"\bseries\s+f\b", re.IGNORECASE)),
    ("Pre-Seed", re.compile(r"\bpre[\s-]?seed\b", re.IGNORECASE)),
    ("Seed", re.compile(r"\bseed\b", re.IGNORECASE)),
    ("Pre-IPO", re.compile(r"\bpre[\s-]?ipo\b", re.IGNORECASE)),
    ("Venture Debt", re.compile(r"\bventure\s+debt\b", re.IGNORECASE)),
    ("Bridge", re.compile(r"\bbridge\s+(?:round|funding|financing)\b|\bbridge\b(?=.{0,30}\bround\b)", re.IGNORECASE)),
    ("Debt", re.compile(r"\bdebt\s+(?:round|funding|financing)\b|\bdebt\b", re.IGNORECASE)),
    ("Acquisition", re.compile(r"\bacquisition\b|\bacquir(?:es|ed|ing)\b", re.IGNORECASE)),
]


def extract_round_type(text: str) -> dict[str, Any]:
    """Match the round/stage vocabulary; first (most-specific) hit wins."""
    text = text or ""
    for stage, pattern in _ROUND_PATTERNS:
        if pattern.search(text):
            return {"stage": stage, "confidence": 0.85}
    return {"stage": None, "confidence": 0.0}


# ---------------------------------------------------------------------------
# Startup name
# ---------------------------------------------------------------------------

# A capitalized name token: Zepto, Qure.ai, Ola-Electric, M2P, BharatPe...
_NAME_TOKEN = r"[A-Z][A-Za-z0-9.&'’-]*"
_COMPANY_RE = re.compile(
    rf"((?:{_NAME_TOKEN}\s+){{0,4}}{_NAME_TOKEN})[\s,]+"
    r"(?:[Rr]aises|[Rr]aised|[Ss]ecures|[Ss]ecured|[Bb]ags|[Bb]agged"
    r"|[Ll]ands|[Ll]anded|[Pp]icks\s+[Uu]p|[Pp]icked\s+[Uu]p|[Cc]loses|[Cc]losed)\b"
)

# Leading qualifier tokens to strip from a matched name sequence.
_QUALIFIER_TOKENS = {
    "the", "this", "indian", "india's", "startup", "startups", "platform",
    "company", "firm", "unicorn", "app", "brand", "major", "giant", "maker",
    "fintech", "edtech", "healthtech", "agritech", "foodtech", "proptech",
    "insurtech", "deeptech", "spacetech", "cleantech", "logistics", "mobility",
    "gaming", "saas", "d2c", "b2b", "b2c", "ev", "ecommerce", "e-commerce",
    "quick-commerce", "ai", "crypto", "web3",
    # descriptor words seen leading older Inc42 ledes
    "online", "mobile", "hyperlocal", "marketplace", "elearning", "e-learning",
    "big", "data", "social", "digital", "tech", "hyperlocal", "on-demand",
    "healthcare", "wealthtech", "agtech", "retailtech", "legaltech", "hrtech",
}


def _clean_company(raw: str) -> str | None:
    tokens = raw.split()
    # Strip a leading "<Place> Based" / "<Place>-based" descriptor
    # (e.g. "Hyderabad Based CustomFurnish" -> "CustomFurnish").
    if len(tokens) >= 2 and tokens[1].lower().strip(",.").rstrip(".") == "based":
        tokens = tokens[2:]
    while tokens:
        head = tokens[0].lower().strip(",")
        if head.endswith("-based") or head in _QUALIFIER_TOKENS:
            tokens.pop(0)
        else:
            break
    name = " ".join(tokens).strip(" ,.;:'\"’‘`")
    return name or None


def extract_startup_name(text: str, title: str | None = None) -> dict[str, Any]:
    """Capitalized token sequence immediately before a funding verb —
    title first, then the body's first paragraph."""
    if title:
        m = _COMPANY_RE.search(title)
        if m:
            name = _clean_company(m.group(1))
            if name:
                return {"company": name, "confidence": 0.85}

    body = (text or "").strip()
    first_para = body.split("\n\n", 1)[0][:600]
    m = _COMPANY_RE.search(first_para)
    if m:
        name = _clean_company(m.group(1))
        if name:
            return {"company": name, "confidence": 0.6}
    return {"company": None, "confidence": 0.0}


# ---------------------------------------------------------------------------
# Investors
# ---------------------------------------------------------------------------

_LED_BY_RE = re.compile(r"\b(?:co-?led\s+by|led\s+by)\s+([^.;\n]+)", re.IGNORECASE)
_PARTICIPATION_RES = [
    re.compile(r"\bwith\s+participation\s+(?:from|of)\s+([^.;\n]+)", re.IGNORECASE),
    re.compile(r"\bparticipation\s+(?:from|of)\s+([^.;\n]+)", re.IGNORECASE),
    re.compile(r"\bbacked\s+by\s+([^.;\n]+)", re.IGNORECASE),
    re.compile(r"\binvestors?\s+includ(?:e|ed|ing)\s+([^.;\n]+)", re.IGNORECASE),
    # "Existing investors MassMutual Ventures and Sequoia Capital also participated"
    re.compile(
        r"\b(?:existing|other|new)?\s*investors?\s+([A-Z][^.;\n]+?)\s+(?:also\s+)?participated\b"
    ),
]
# Cut a "led by X" capture before a trailing participation clause.
_CLAUSE_CUT_RE = re.compile(
    r",?\s+(?:with|along\s+with|alongside|as\s+well\s+as)\b.*$", re.IGNORECASE
)
_GENERIC_ENTITY_RE = re.compile(
    r"(?i)^(?:(?:existing|other|new|its|several|a\s+few|angel)\s+)*"
    r"(?:investors?|backers?|funds?|angels?|others?|among\s+others)$"
)
_MAX_INVESTORS = 15


def _split_entities(blob: str) -> list[str]:
    blob = _CLAUSE_CUT_RE.sub("", blob)
    parts = re.split(r",|\band\b|&", blob)
    out: list[str] = []
    for part in parts:
        name = part.strip(" ,.;:'\"’")
        name = re.sub(
            r"(?i)^(?:existing\s+investors?\s+|investors?\s+)", "", name
        ).strip()
        if len(name) < 2 or _GENERIC_ENTITY_RE.match(name):
            continue
        if not name[0].isupper() and not name[0].isdigit():
            continue
        out.append(name)
    return out


def extract_investors(text: str) -> dict[str, Any]:
    """Entities after 'led by' / 'backed by' / 'with participation from' etc."""
    text = text or ""
    investors: list[str] = []
    seen: set[str] = set()
    lead_investor: str | None = None
    has_lead = False

    def add(names: list[str]) -> None:
        for n in names:
            key = n.lower()
            if key not in seen and len(investors) < _MAX_INVESTORS:
                seen.add(key)
                investors.append(n)

    for m in _LED_BY_RE.finditer(text):
        names = _split_entities(m.group(1))
        if names:
            has_lead = True
            if lead_investor is None:
                lead_investor = names[0]
            add(names)

    for regex in _PARTICIPATION_RES:
        for m in regex.finditer(text):
            add(_split_entities(m.group(1)))

    if has_lead:
        confidence = 0.8
    elif investors:
        confidence = 0.5
    else:
        confidence = 0.0
    return {"investors": investors, "lead_investor": lead_investor, "confidence": confidence}


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------

_CITY_NORMALIZE = {"bangalore": "Bengaluru", "gurgaon": "Gurugram"}
# Longest-first so "New Delhi" wins over "Delhi", "Navi Mumbai" over "Mumbai".
_CITIES = [
    "Thiruvananthapuram", "Bhubaneswar", "Navi Mumbai", "Coimbatore",
    "Chandigarh", "Ahmedabad", "Bengaluru", "Bangalore", "Hyderabad",
    "New Delhi", "Gurugram", "Vadodara", "Lucknow", "Gurgaon", "Kolkata",
    "Chennai", "Guwahati", "Mangalore", "Mysuru", "Nagpur", "Indore",
    "Mumbai", "Jaipur", "Kanpur", "Mohali", "Bhopal", "Kochi", "Surat",
    "Noida", "Delhi", "Pune", "Goa",
]
_CITY_ALT = "|".join(sorted(_CITIES, key=len, reverse=True))
_BASED_RE = re.compile(rf"\b({_CITY_ALT})[\s-]based\b", re.IGNORECASE)
_CITY_RE = re.compile(rf"\b({_CITY_ALT})\b", re.IGNORECASE)


def _normalize_city(raw: str) -> str:
    lower = raw.lower()
    if lower in _CITY_NORMALIZE:
        return _CITY_NORMALIZE[lower]
    for city in _CITIES:
        if city.lower() == lower:
            return city
    return raw.title()


def extract_location(text: str) -> dict[str, Any]:
    """Prefer the 'X-based' pattern, else the first city mention."""
    text = text or ""
    m = _BASED_RE.search(text)
    if m:
        return {"location": _normalize_city(m.group(1)), "confidence": 0.9}
    m = _CITY_RE.search(text)
    if m:
        return {"location": _normalize_city(m.group(1)), "confidence": 0.6}
    return {"location": None, "confidence": 0.0}


# ---------------------------------------------------------------------------
# Sector
# ---------------------------------------------------------------------------

# keyword regex -> sector label
_SECTOR_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bfintech\b", re.IGNORECASE), "Fintech"),
    (re.compile(r"\bedtech\b", re.IGNORECASE), "Edtech"),
    (re.compile(r"\bhealth[\s-]?tech\b", re.IGNORECASE), "Healthtech"),
    (re.compile(r"\bagri[\s-]?tech\b", re.IGNORECASE), "Agritech"),
    (re.compile(r"\be-?commerce\b", re.IGNORECASE), "E-commerce"),
    (re.compile(r"\bsaas\b", re.IGNORECASE), "SaaS"),
    (re.compile(r"\blogistics\b", re.IGNORECASE), "Logistics"),
    (re.compile(r"\bEV\b"), "EV & Mobility"),  # case-sensitive: avoid matching "ev" in prose
    (re.compile(r"\belectric\s+vehicles?\b|\bmobility\b", re.IGNORECASE), "EV & Mobility"),
    (re.compile(r"\bfood[\s-]?tech\b", re.IGNORECASE), "Foodtech"),
    (re.compile(r"\bprop[\s-]?tech\b", re.IGNORECASE), "Proptech"),
    (re.compile(r"\bgaming\b", re.IGNORECASE), "Gaming"),
    (re.compile(r"\bAI\b"), "Deeptech & AI"),  # case-sensitive
    (re.compile(r"\bdeep[\s-]?tech\b|\bartificial\s+intelligence\b", re.IGNORECASE), "Deeptech & AI"),
    (re.compile(r"\bspace[\s-]?tech\b", re.IGNORECASE), "Spacetech"),
    (re.compile(r"\bclean[\s-]?tech\b|\bclimate[\s-]?tech\b", re.IGNORECASE), "Cleantech"),
    (re.compile(r"\bD2C\b|\bdirect[\s-]to[\s-]consumer\b", re.IGNORECASE), "D2C"),
    (re.compile(r"\binsur[\s-]?tech\b", re.IGNORECASE), "Insurtech"),
    (re.compile(r"\bweb3\b|\bcrypto(?:currency)?\b|\bblockchain\b", re.IGNORECASE), "Web3 & Crypto"),
]


def extract_sector(text: str) -> dict[str, Any]:
    """Keyword-taxonomy sector matching."""
    text = text or ""
    sectors: list[str] = []
    for pattern, label in _SECTOR_PATTERNS:
        if label not in sectors and pattern.search(text):
            sectors.append(label)
    return {"sectors": sectors, "confidence": 0.7 if sectors else 0.0}


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------

def rule_extract(
    *,
    article_text: str,
    article_title: str | None,
    source_tier: str = "tier_2",
) -> dict[str, Any]:
    """Run all rule-based extractors over an article.

    Returns a dict shape-compatible with pipeline.extractor.extract_deal's JSON,
    plus `field_confidences` and `extraction_method` keys.

    date confidence is 0.0 here — the publication date is attached by the
    caller, which sets it to 1.0 when present.
    """
    text = article_text or ""
    title = article_title or None
    combined = f"{title}\n\n{text}" if title else text

    amount = extract_amount(text, title=title)
    round_type = extract_round_type(combined)
    name = extract_startup_name(text, title=title)
    investors = extract_investors(combined)
    location = extract_location(combined)
    sector = extract_sector(combined)

    field_confidences = {
        "amount": amount["confidence"],
        "round_type": round_type["confidence"],
        "startup_name": name["confidence"],
        "date": 0.0,
        "investors": investors["confidence"],
    }
    confidence = compute_confidence(field_confidences, source_tier)

    is_funding_event = name["company"] is not None and (
        amount["confidence"] > 0 or round_type["confidence"] > 0
    )

    return {
        "is_funding_event": is_funding_event,
        "company": name["company"],
        "amount_raw": amount["amount_raw"],
        "amount_value": amount["amount_value"],
        "amount_currency": amount["amount_currency"],
        "stage": round_type["stage"],
        "sectors": sector["sectors"],
        "investors": investors["investors"],
        "lead_investor": investors["lead_investor"],
        "deal_date": None,
        "location": location["location"],
        "notes": None,
        "confidence": confidence,
        "field_confidences": field_confidences,
        "extraction_method": "rule_based",
    }
