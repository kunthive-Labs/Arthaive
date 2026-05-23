# 06 — Entity resolution

## Why this matters

Look at these strings:

- "Sequoia Capital India"
- "Sequoia India"
- "Peak XV Partners"
- "Peak XV"

They are all the same investor — Sequoia rebranded to Peak XV in 2023. If our database stores them as four different rows, then:

- Search for "Peak XV" misses three quarters of their deals.
- The investor leaderboard shows four entries instead of one.
- A startup's funding history shows a fake "different lead investor" every round.

This is the canonical identity problem (principle **P2**). Entity resolution is the system that solves it: every name we encounter maps to one canonical name before it enters the dataset.

## The two halves

### 1. The alias tables

`startup_aliases` and `investor_aliases` (defined in `011_startup_aliases.sql`) are the source of truth for "these strings all mean the same entity".

```sql
create table startup_aliases (
  company    text,        -- canonical name (e.g. "Meesho")
  alias_name text UNIQUE, -- variant we saw (e.g. "Fashnear Technologies")
  alias_type text         -- 'former_name' | 'alternate_spelling' | 'short_name' | 'brand_name'
);
```

The pair `(company, alias_name)` says: when you see `alias_name` in an article, store it as `company`.

Day-one aliases are seeded in `supabase/seed_aliases.sql` — about 30 well-known cases (BharatPe / Bharat Pe, Meesho / Fashnear Technologies, Peak XV / Sequoia India, etc.). The admin adds more over time via the entity manager.

### 2. The resolver

`pipeline/entity_resolver.py` is the runtime that looks up names against the alias tables.

```python
def resolve(name: str, entity_type: "startup"|"investor") -> ResolutionResult:
    # returns canonical, suggested, score
```

It runs three checks in order:

1. **Exact alias hit.** `SELECT company FROM startup_aliases WHERE alias_name = ?`. If found, return that canonical name with score 100.
2. **Exact canonical hit.** `SELECT company FROM startup_aliases WHERE company = ?`. The name already is canonical.
3. **Fuzzy match.** Build an in-memory index of every canonical name and every alias (cached with `@lru_cache`), then use `rapidfuzz.process.extractOne` with `token_sort_ratio` as the scorer. Returns the best candidate and its 0–100 score.

The fuzzy step also pulls **every name already in `deals.company`** (or `investors.name`) into the candidate set. So even a company that does not have a formal alias row yet, but has been verified in a deal before, will match exactly on its next mention.

## The three thresholds

| Score | What we do | Why |
|---|---|---|
| **≥ 92** | Auto-canonicalize. The extracted name is replaced by the canonical before insertion. | Token-sort-ratio ≥ 92 is virtually always the same entity ("Sequoia Capital India" vs. "Sequoia Capital India Advisors" scores 96). False positives are rare; the admin can correct any that slip through. |
| **75 – 91** | Attach as `suggested_company`, route record to review queue. | This band catches "probable but check me" — e.g. "BharatPe" vs. "BharatPay" scores ~85. We never silently merge here; a human confirms. |
| **< 75** | Treat as a new entity. The original name is used as-is. | If a name has no good match, it is probably a new startup or investor. Eventually an admin reviews the record and either adds an alias or accepts the new entity. |

Constants live at the top of `entity_resolver.py`:

```python
AUTO_MATCH_THRESHOLD = 92
SUGGEST_THRESHOLD = 75
```

These are tunable. If we see too many false-positive auto-matches, bump the auto threshold to 95. If we see too few suggestions, drop the suggest threshold to 70.

## How aliases grow over time

The whole system gets smarter the longer it runs. Three sources feed `startup_aliases`:

1. **Seed data** (`seed_aliases.sql`) — the 30 most common known cases at day one.
2. **Admin entity manager** — when a reviewer sees a new name variant, they add it manually.
3. **Auto-alias on approval** (Phase 5.4, not yet implemented) — when an admin approves a review item where the extracted name differs from the canonical match, we automatically insert the extracted name into `startup_aliases`. So if a reviewer confirms "Sequoia India" → "Peak XV Partners" once, the next pipeline run resolves it without their help.

This is the closed loop that makes entity resolution a one-time human cost per variant. Every name learned is remembered.

## What "token_sort_ratio" is and why we chose it

`rapidfuzz.fuzz.token_sort_ratio(a, b)`:
1. Splits both strings into tokens (whitespace).
2. Sorts the tokens alphabetically in each.
3. Joins them back and compares with normalized Levenshtein.

This handles word order ("Sequoia India" vs. "India Sequoia"), capitalization (case-folded internally), and minor punctuation. It does not handle:

- **Substring matches.** "Peak XV" vs. "Peak XV Partners" scores ~70 because "Partners" is unmatched. We mitigate this by indexing both the canonical name and aliases — "Peak XV" is itself an alias of "Peak XV Partners" in the seed data.
- **Phonetic similarity.** "Razorpay" vs. "Razorpe" depends on Levenshtein distance, not pronunciation. Acceptable for now.

If we hit a recurring failure mode (e.g. acronym vs. full name like "GA" vs. "General Atlantic"), the fix is an alias row, not a smarter scorer.

## Performance

The fuzzy index is built once per process and cached in memory via `@lru_cache(maxsize=2)` (one slot per entity type). Building it pulls all aliases + canonical names — currently a few thousand strings, sub-second.

In a long-running batch, `clear_index_cache()` resets the cache after new aliases are added so subsequent records see the updates. The pipeline does not do this between records today — fresh aliases land on the next run, not mid-run. That is fine: the slow path is the AI call, not entity resolution.

If the candidate set grows past ~50k strings (i.e. once we have tens of thousands of canonical entities), we will need to either:
- Move the fuzzy match into Postgres via the trigram GIN index (`startup_aliases_trgm_idx` already exists).
- Switch to an ANN library like `tantivy` or pgvector.

Until then, in-process rapidfuzz is plenty fast.

## What this system does not solve

- **Subsidiary vs. parent.** "Flipkart" and "Flipkart Internet" are aliases today, but if Walmart's India arm raises money, that is technically a different legal entity from Flipkart. The schema cannot express parent/subsidiary; the alias system collapses them.
- **Multi-canonical investors.** "Sequoia Capital" globally and "Peak XV Partners" India are arguably different funds today. We treat them as one because for Indian-deal purposes they share an investment committee through 2023, and disentangling is more error-prone than just calling them "Peak XV Partners".
- **Person-investor names.** "Kunal Shah" the angel and "Kunal Shah" the founder of CRED are the same person but appear in both `investors` and as the founder of a startup. We have no founders table yet; this will be addressed in a future phase.

These are conscious trade-offs. The alias-table approach is intentionally simple — when it stops being enough, we layer on without rebuilding.
