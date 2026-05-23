# 09 — Roadmap

The detailed plan lives in `PHASES.md` at the repo root. This page is the human-readable snapshot — what is done, what is partial, what is ahead. Updated 2026-05-23.

## Where we are

Roughly **50% complete by effort.** Phases 1–4 are substantially done; Phase 5 v1 just landed.

```
Phase 0 — Frontend foundation             ██████████  done
Phase 1 — Supabase Live Database          ██████████  done
Phase 2 — Admin Interface                 ██████████  done
Phase 3 — Discovery Pipeline              ██████████  done
Phase 4 — Extraction Pipeline             ████████░░  done minus rule-based layer
Phase 5 — Entity Resolution               ████████░░  v1 done, auto-alias pending
Phase 6 — Analytics & Reports             ███░░░░░░░  partial — analytics page wires DB but reports unbuilt
Phase 7 — AI Layer                        ░░░░░░░░░░  not started
Phase 8 — Public API v1                   ░░░░░░░░░░  not started
Phase 9 — Production Polish & Launch      ░░░░░░░░░░  not started
```

## Phase-by-phase status

### Phase 0 — Frontend foundation ✅

The Next.js app with 1695 static deals, full UI, auth, analytics, deal/investor/sector pages, search, live feed. Deployed on Vercel.

### Phase 1 — Supabase Live Database ✅

Fifteen migrations in place (`001` through `015`). Schema includes deals, sources, investors, sectors, startup_aliases, investor_aliases, review_queue, pipeline_jobs, user_profiles, plus user features (bookmarks, saved searches, alerts, notification preferences). RLS policies wired. Functions and views in place for common reads.

### Phase 2 — Admin Interface ✅

`/admin` console with sub-pages for review, entities, sources, pipeline, import, export. Auth-gated via middleware + `ADMIN_EMAILS`.

### Phase 3 — Discovery Pipeline ✅

`pipeline/` directory has discovery (sitemap walker), fetcher (httpx + Wayback fallback), source registry, run orchestrator with `--dry-run` and `--no-ai`. Today only Entrackr is wired; adding Inc42 and YourStory is config-only and is the next sub-task.

### Phase 4 — Extraction Pipeline 🔶

**Done:**
- Claude Haiku AI extractor with strict JSON schema (`extractor.py`)
- SQLite response cache so re-runs cost nothing
- Currency normalization (INR ↔ USD at 83.5)
- Deal-level dedup by company + amount + date window
- Auto-approval routing: confidence ≥ 0.80 + canonical company + date + amount + no duplicate → `deals` (verified); else → `review_queue`
- Per-run audit in `pipeline_jobs`

**Deferred from `PHASES.md` (chose AI-first over the rule-based-first plan):**
- Rule-based regex extractors for amount / stage / investors. We skipped these because Haiku already handles them, and adding a regex layer is a maintenance cost without a clear quality win. Revisit if we want a deterministic sanity check on AI output.
- `confidence.py` weighted scoring across multiple fields. We use Claude's self-rated confidence directly. Revisit if false-positive auto-approves get common.
- Historical USD/INR rates via Open Exchange Rates. Current single rate is good enough for analytics; bring this in when we add per-round historical accuracy.

### Phase 5 — Entity Resolution 🔶

**Done (v1):**
- `pipeline/entity_resolver.py` with exact alias lookup + rapidfuzz fuzzy match
- 92/75 thresholds for auto-canonicalize / suggest-for-review / new-entity
- In-memory candidate index with `@lru_cache`
- `resolve_investors([…])` for canonicalizing the investor list
- Wired into the pipeline before deal-level dedup

**Pending:**
- **5.4 Auto-alias on approval.** When an admin approves a review item with a different raw name than the canonical match, automatically insert into `startup_aliases`. This is the closed loop that makes the resolver smarter every approval. Needs work in `app/api/admin/review/[id]/route.ts`.
- **5.1 Contextual boosting.** Boost the fuzzy score when the city / sector / amount-range matches what we already know about a candidate. Not started; skip until we have signal on the false-positive rate.

### Phase 6 — Analytics & Reports 🔶

**Done:**
- `lib/db/analytics.ts` reads from `deals where record_status='verified'` first, falls back to static.
- Analytics charts (monthly, sector, stage, city, top investors) all render from live DB when populated.

**Pending:**
- `/reports` page generating weekly and monthly digests on demand
- "View underlying data →" link on every chart pointing to a pre-filtered `/explore`
- `components/coverage-notice.tsx` exists but needs DB-driven date-range disclosure (P8 honesty)
- Year-over-year comparison view

### Phase 7 — AI Layer ⏳

Not started. Planned scope (per `PHASES.md §7`):
- Weekly trend summaries written by Claude — "Top sectors this week", "Biggest rounds", "Notable new investors"
- Natural-language search — "show me Series A fintech rounds led by Peak XV in 2026"
- Sector classifier — when the rule-based sector taxonomy is ambiguous, fall back to Claude
- Anomaly detection — flag rounds that look out of pattern for the sector/stage

### Phase 8 — Public API v1 ⏳

Not started. Planned scope:
- Lift `/api/search`, `/api/stats`, `/api/export` into a versioned `/api/v1/*` namespace
- API key registration page under `/profile`
- Per-key rate limiting (use Upstash or the Supabase `rate_limit` table already scaffolded)
- Docs page at `/api/docs`
- Tests covering the public surface

### Phase 9 — Production Polish & Launch ⏳

Not started. Planned scope:
- DB index audit on production query patterns
- Mobile UX pass (the desktop layout is solid; mobile filters need work)
- SEO — sitemap, meta tags, structured data
- README rewrite for outside contributors
- Public launch

## Risks worth tracking

| Risk | What it would cost us | Mitigation in place |
|---|---|---|
| AI extraction false-positives auto-approve garbage | Bad rows in `deals` showing publicly | Confidence threshold ≥ 0.80, also require canonical company + date + amount, conservative thresholds |
| Source sites change HTML and break the fetcher | Discovery returns articles but fetcher returns empty bodies | CSS selectors are tried in order; Wayback Machine fallback for dead URLs; future: monitor `articles_fetched / articles_filtered` ratio |
| Entity resolver over-matches and merges distinct entities | Two different companies show up as one | 92 threshold is conservative; admin review for 75-91; the alias table is the override mechanism |
| Pipeline outage goes unnoticed | Days of missing data | `pipeline_jobs` table and admin page exist; need to wire an alert on consecutive `failed` runs |
| Anthropic price changes | Pipeline economics shift | The on-disk cache means we only pay once per article ever; even a 10× price increase keeps us within budget |
| Source sites add anti-scraping | We cannot crawl | Wayback fallback partially helps; future: honor robots.txt, partner with publishers for direct feeds |

## Decision queue (what to pick next)

Rough priority order if you want to push hardest on impact:

1. **Finish Phase 5.4 (auto-alias on approval).** Three hours of work, makes every future review faster.
2. **Add Inc42 to the pipeline config.** Doubles coverage with a config-only change.
3. **Wire the analytics page coverage notice to live DB.** P8 honesty; one component change.
4. **Phase 6 reports page.** High user value — weekly digests are shareable, drive return visits.
5. **Phase 8 public API.** Unlocks external use cases (researchers, journalists, partner sites).
6. **Phase 7 AI layer.** Highest moat, but only worth it once the data foundation is dense enough that trend summaries are meaningful — needs Phase 6 first.

Phase 9 polish is whenever the above are stable.
