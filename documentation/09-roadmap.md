# 09 — Roadmap

This is the current implementation snapshot. The detailed build log still lives in `PHASES.md`; this page is the shorter status view for contributors.

Updated 2026-07-03.

## Where We Are

Arthaive is feature-complete enough to operate as a public funding-intelligence product: static fallback data, Supabase-backed live data, auth, admin workflows, reports, AI helpers, and API v1 are all present. The remaining work is mostly production hardening, data-quality loops, monitoring, and UX polish.

```
Phase 0 — Frontend foundation             done
Phase 1 — Supabase live database          done
Phase 2 — Admin interface                 done
Phase 3 — Discovery pipeline              done
Phase 4 — Extraction pipeline             done
Phase 5 — Entity resolution               mostly done
Phase 6 — Analytics & reports             done, polish ongoing
Phase 7 — AI layer                        implemented, fallback paths needed
Phase 8 — Public API v1                   implemented
Phase 9 — Production polish & launch      in progress
```

## Current State

### Frontend Foundation

The app is a Next.js 16 App Router project with a generated 14,700+ deal static fixture. Public/static data views can build without Supabase configuration; auth-gated user/admin areas require Supabase.

### Supabase Live Database

Migrations cover deals, sources, review queue, aliases, pipeline jobs, API keys, user profiles, dashboards, notes, alerts, bookmarks, saved searches, analytics views, and performance indexes. RLS policies are in place for public verified reads, admin writes, and per-user private data.

### Admin Interface

`/admin` includes review, entity management, source management, pipeline status, import/export, and AI usage views. Route protection now runs through the Next.js `proxy.ts` convention.

### Pipeline

The Python pipeline includes discovery/fetching, rule extraction, Claude extraction fallback, currency normalization, entity resolution, duplicate checks, review routing, and audit logging.

### Entity Resolution

Alias tables, fuzzy matching, and investor canonicalization are implemented. The most important remaining loop is to keep inserting aliases from admin corrections so future runs improve automatically.

### Analytics & Reports

Analytics pages and weekly/monthly report pages are implemented against Supabase with static fallback. Remaining polish: deeper “view underlying data” links from every chart and stronger report/share workflows.

### AI Layer

AI helpers exist for trend summaries, natural-language search, and sector classification. They degrade when `ANTHROPIC_API_KEY` is absent; the next step is tighter cost monitoring and clearer UI labeling for every AI-generated surface.

### Public API v1

API v1 endpoints, API keys, rate-limit tiers, API docs, and direct route-handler tests exist. Production should use Upstash Redis for distributed rate limiting.

### Production Polish

Recent hardening includes a clean lint baseline, Next 16 proxy migration, and a production build that works without Supabase env vars for public/static fallback paths. Ongoing work should focus on CI, monitoring, mobile filter UX, chart prerender warnings, and source coverage disclosure.

## Risks Worth Tracking

| Risk | Impact | Mitigation |
|---|---|---|
| AI extraction false positives | Bad public data | Conservative confidence routing, review queue, source links |
| Pipeline outage | Missing recent deals | `pipeline_jobs` table exists; add alerting on repeated failures |
| Entity over-merge | Companies/investors collapse incorrectly | Conservative thresholds, alias review, admin correction loop |
| Rate-limit fallback in serverless | API abuse across instances | Configure Upstash Redis in production |
| Stale generated fixture | Static fallback diverges from CSV corpus | `predev`/`prebuild` regenerate `data/funding-data.ts` |
| Documentation drift | Contributors deploy or extend the wrong thing | Keep README, roadmap, and phase log synchronized |

## Next Best Work

1. Auto-insert startup/investor aliases when admin approvals correct raw extracted names.
2. Add monitoring for failed pipeline runs and unusual extraction/approval rates.
3. Add “view underlying data” links from analytics/report charts to pre-filtered `/explore`.
4. Expand tests around reports, auth-gated APIs, admin review approval, and static fallback.
5. Configure distributed rate limiting in production and document required env vars.
6. Run a mobile UX pass on filters, dashboard builder, and report tables.
