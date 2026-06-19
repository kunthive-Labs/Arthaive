# Funding-deal extraction protocol (Indian startup funding news)

You are a precise structured-data extractor. Read the INPUT JSONL file of candidate
articles (each line: `{"url","title","pub_date":"YYYY-MM-DD","body"}`) and WRITE one JSON
object per REAL funding deal to the OUTPUT file (JSONL, one object per line).

NOTE on bodies: some sources (YourStory) prepend nav cruft like
`ADVERTISEMENT Funding <Author> <N> Stories <Weekday Month DD, YYYY>, <N> min Read` —
ignore that boilerplate; the real article follows.

## Each emitted line MUST have exactly these keys
```
{"is_funding_event":true,"company":str,"amount_value":number|null,
 "amount_currency":"USD"|"INR"|null,"amount_raw":str|null,"stage":str|null,
 "sectors":[str],"investors":[str],"lead_investor":str|null,
 "deal_date":"YYYY-MM-DD","location":str|null,"notes":str|null,"source_url":str}
```

## Field rules
- **amount_value** = numeric in BASE UNITS of amount_currency. crore=1e7, lakh=1e5,
  Mn/million=1e6, Bn/billion=1e9. "$30 Mn"→30000000 USD; "$2.5 M"→2500000 USD;
  "INR 7 Cr"→70000000 INR; "Rs 40 crore"→400000000 INR. Undisclosed → amount_value=null,
  amount_currency=null, amount_raw="undisclosed". NEVER invent an amount; ignore numbers
  that are market-size / valuation / fund-corpus rather than the raise itself.
- **stage** = one of Pre-Seed, Seed, Pre-Series A, Series A..F, Bridge, Debt, Venture Debt,
  Pre-IPO, Acquisition, or null.
- **sectors** = best-fit labels, e.g. ["Fintech"],["Edtech"],["E-commerce"],["Healthtech"],
  ["Logistics"],["SaaS"],["Foodtech"],["EV & Mobility"],["Deeptech & AI"].
- **company** = the STARTUP that RECEIVED the money (never the investor). Strip descriptors:
  "QSR Chain Faasos"→"Faasos", "Hyderabad Based X"→"X", "Chat Based Health App Y"→"Y".
- **investors** = every named investor, LEAD listed FIRST; lead_investor = that lead
  (null if "investors including..." with no clear lead). Individuals/angels count.
- **deal_date** = explicit date in the body if given, else the candidate's pub_date.
  Always output a valid YYYY-MM-DD.
- **source_url** = the candidate's "url".

## DO NOT emit (skip entirely)
- **Non-Indian deals.** Only emit when the company is an INDIAN startup (HQ in India, or
  India as its primary market). Skip foreign-only rounds and global M&A with no India angle
  — e.g. Uber's global SoftBank round, Bayer/Monsanto, Rosneft/Essar, GM/Lyft, Apple/Shazam,
  Didi, Grab/Go-Jek (SE-Asia). When unsure and there's no clear India tie, skip.
- VC/PE FUND launches or fund closes (the investor raising its OWN fund), e.g.
  "Launches $200 Mn Paragon Partners", "X closes Fund III".
- Weekly roundup/digest posts (titles like "Funding Galore", "Startup Fundings Of The Week",
  "This Week In Funding", "roundup", "weekly", year-in-review).
- Startup advice / opinion / how-to / listicle posts (e.g. "fundraising dos and don'ts",
  "bootstrapped vs funded", "how much should you raise") — NOT deals.
- Product launches, hires, partnerships, regulatory/earnings/GMV/valuation-only stories.
- Acquisitions with NO disclosed amount that are pure strategic news — BUT a notable
  acquisition may be emitted with stage "Acquisition", company = the acquired startup,
  amount null. Acquisitions WITH a disclosed amount: always emit.

## Quality
- Be conservative and accurate. A company almost never closes two distinct rounds on the
  same day. Prefer the article's primary stated figure.
- After writing the file, verify every line is valid JSON with exactly the 13 keys.

## Return (final message, compact — NOT the full JSON)
lines read; deals emitted; skipped count with a one-word reason tally
(fund_launch/roundup/advice/not_funding); and company+amount for the first 5 emitted.
