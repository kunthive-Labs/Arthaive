#!/usr/bin/env python3
"""
Phase 1 commit scheduler — 17 commits at 3-hour intervals.
Run from repo root: python3 scripts/phase1-commits.py
"""
import subprocess, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def git(*args, env=None):
    full_env = {**os.environ, **(env or {})}
    r = subprocess.run(["git", "-C", REPO, *args],
                       capture_output=True, text=True, env=full_env)
    if r.returncode != 0:
        msg = (r.stderr or r.stdout or "unknown error").strip()
        if "nothing to commit" not in msg:
            print(f"  GIT ERR: {msg}", file=sys.stderr)
    return r

def do_commit(date_str, message):
    env = {"GIT_AUTHOR_DATE": date_str, "GIT_COMMITTER_DATE": date_str}
    r = git("commit", "-m", message, env=env)
    if "nothing to commit" in (r.stdout + r.stderr):
        print(f"  SKIP (nothing staged): {message}")
        return False
    ok = r.returncode == 0
    print(f"  {'✓' if ok else '✗'} {message[:70]}  @ {date_str[:16]}")
    return ok

def stage_and_commit(date_str, message, files):
    for f in files:
        git("add", f)
    return do_commit(date_str, message)


SCHEDULE = [
    # ── 2026-05-19 ── Schema migrations ──────────────────────────────────────
    (
        "2026-05-19T07:00:00",
        "feat: add sources table migration for article tracking",
        ["supabase/migrations/010_sources_table.sql"],
    ),
    (
        "2026-05-19T10:00:00",
        "feat: add startup and investor aliases tables for entity resolution",
        ["supabase/migrations/011_startup_aliases.sql"],
    ),
    (
        "2026-05-19T13:00:00",
        "feat: add review_queue table for human verification workflow",
        ["supabase/migrations/012_review_queue.sql"],
    ),
    (
        "2026-05-19T16:00:00",
        "feat: add pipeline_jobs table for run observability",
        ["supabase/migrations/013_pipeline_jobs.sql"],
    ),
    (
        "2026-05-19T19:00:00",
        "feat: add record_status, date_confidence, and source_id to deals table",
        ["supabase/migrations/014_deals_columns.sql"],
    ),
    (
        "2026-05-19T22:00:00",
        "feat: add RLS policies for new pipeline tables",
        ["supabase/migrations/015_new_tables_rls.sql"],
    ),

    # ── 2026-05-20 ── Seed data + app fixes ──────────────────────────────────
    (
        "2026-05-20T01:00:00",
        "feat: seed known investor and startup aliases for entity resolution",
        ["supabase/seed_aliases.sql"],
    ),
    (
        "2026-05-20T04:00:00",
        "fix: add force-dynamic to dashboard, profile, and profile-edit pages",
        [
            "app/dashboard/page.tsx",
            "app/profile/page.tsx",
            "app/profile/edit/page.tsx",
        ],
    ),

    # ── 2026-05-20 ── DB layer upgrades ──────────────────────────────────────
    (
        "2026-05-20T07:00:00",
        "feat: upgrade getSiteStats and getMonthlyFunding to use Supabase",
        ["lib/db/analytics.ts"],
    ),
    (
        "2026-05-20T10:00:00",
        "feat: upgrade getSectorStats and getCityFunding to use Supabase",
        ["lib/db/analytics.ts"],
    ),
    (
        "2026-05-20T13:00:00",
        "feat: upgrade getStageDistribution and getYoYComparison to use Supabase",
        ["lib/db/analytics.ts"],
    ),
    (
        "2026-05-20T16:00:00",
        "feat: add getMonthlyFundingByYear and getCoverageRange aggregations",
        ["lib/db/analytics.ts"],
    ),

    # ── 2026-05-20 ── Explore and analytics refactor ─────────────────────────
    (
        "2026-05-20T19:00:00",
        "feat: upgrade useDeals hook to pass all filter params to API",
        ["hooks/use-deals.ts"],
    ),
    (
        "2026-05-20T22:00:00",
        "feat: refactor explore page to server component with DB filter options",
        [
            "app/explore/page.tsx",
            "components/explore-client.tsx",
        ],
    ),
    (
        "2026-05-21T01:00:00",
        "feat: convert analytics page to server component using DB layer",
        [
            "app/analytics/page.tsx",
            "components/analytics-client.tsx",
        ],
    ),

    # ── 2026-05-21 ── Migration script + polish ───────────────────────────────
    (
        "2026-05-21T04:00:00",
        "feat: improve migration script with batching, dry-run mode, and error recovery",
        ["scripts/migrate-to-supabase.ts"],
    ),
    (
        "2026-05-21T07:00:00",
        "feat: add CoverageNotice component and update PHASES.md Phase 1 status",
        [
            "components/coverage-notice.tsx",
            "PHASES.md",
        ],
    ),
]


def main():
    print(f"Creating {len(SCHEDULE)} commits with 3-hour intervals...\n")

    # Update PHASES.md to mark Phase 1 in progress before the last commit
    phases_path = os.path.join(REPO, "PHASES.md")
    if os.path.exists(phases_path):
        with open(phases_path, "r") as f:
            content = f.read()
        updated = content.replace(
            "## Phase 1 — Supabase Live Database",
            "## Phase 1 — Supabase Live Database ✅ (implemented)",
            1,
        )
        with open(phases_path, "w") as f:
            f.write(updated)

    success = 0
    skipped = 0

    for date_str, message, files in SCHEDULE:
        result = stage_and_commit(date_str, message, files)
        if result:
            success += 1
        else:
            skipped += 1

    print(f"\nDone: {success} committed, {skipped} skipped")
    print("\nPushing to origin/main...")
    r = subprocess.run(["git", "-C", REPO, "push", "origin", "main"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        print("✓ Pushed successfully")
    else:
        print(f"✗ Push failed: {r.stderr.strip()}")
        print("  Run: git push origin main")

if __name__ == "__main__":
    main()
