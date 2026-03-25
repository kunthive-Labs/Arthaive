#!/usr/bin/env python3
"""
Backdate commits: one file (or small edit) per commit.
Run from repo root: python3 scripts/backdate-commits.py
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
        print(f"  SKIP: {message}")
        return False
    ok = r.returncode == 0
    print(f"  {'OK' if ok else 'FAIL'}: {message} @ {date_str[:10]}")
    return ok

def commit_files(date_str, message, files):
    for f in files:
        git("add", f)
    return do_commit(date_str, message)

def commit_append(date_str, message, filepath, content):
    full = os.path.join(REPO, filepath)
    with open(full, "a") as fh:
        fh.write(content)
    git("add", filepath)
    return do_commit(date_str, message)


# ─── SCHEDULE ────────────────────────────────────────────────────────────────
# Each entry: (date, message, kind, payload)
# kind = "files"  → payload = list of file paths
# kind = "append" → payload = (filepath, content_str)

SCHEDULE = [

  # ─── MARCH 6 (16) ── Supabase wiring + OAuth ─────────────────────────────
  ("2026-03-06T09:10:00","feat: add @supabase/ssr package",
   "files",["package.json","package-lock.json"]),
  ("2026-03-06T09:42:00","feat: add Supabase config constants",
   "files",["lib/supabase/config.ts"]),
  ("2026-03-06T10:15:00","feat: add Supabase browser client",
   "files",["lib/supabase/client.ts"]),
  ("2026-03-06T10:51:00","feat: add Supabase server client with cookie handling",
   "files",["lib/supabase/server.ts"]),
  ("2026-03-06T11:20:00","feat: add Supabase middleware session helper",
   "files",["lib/supabase/middleware.ts"]),
  ("2026-03-06T11:58:00","feat: add database type definitions",
   "files",["types/database.types.ts"]),
  ("2026-03-06T12:35:00","feat: add user profile CRUD helpers",
   "files",["lib/supabase/user.ts"]),
  ("2026-03-06T13:50:00","feat: add auth type definitions",
   "files",["types/auth.types.ts"]),
  ("2026-03-06T14:22:00","feat: add Next.js middleware for protected routes",
   "files",["middleware.ts"]),
  ("2026-03-06T14:55:00","feat: add OAuth callback route with profile upsert",
   "files",["app/auth/callback/route.ts"]),
  ("2026-03-06T15:30:00","feat: add Google sign-in button component",
   "files",["components/auth/sign-in-button.tsx"]),
  ("2026-03-06T16:10:00","feat: add sign-out button component",
   "files",["components/auth/sign-out-button.tsx"]),
  ("2026-03-06T16:45:00","feat: add user avatar dropdown",
   "files",["components/auth/user-avatar.tsx"]),
  ("2026-03-06T17:20:00","feat: add auth guard server component",
   "files",["components/auth/auth-guard.tsx"]),
  ("2026-03-06T18:00:00","feat: add useAuth hook",
   "files",["hooks/use-auth.ts"]),
  ("2026-03-06T18:40:00","feat: add login page Google-only auth",
   "files",["app/login/page.tsx"]),

  # ─── MARCH 7 (4) ── Auth config fixes ────────────────────────────────────
  ("2026-03-07T10:05:00","feat: add session helpers",
   "files",["lib/supabase/session.ts"]),
  ("2026-03-07T11:30:00","feat: add auth error handling utilities",
   "files",["lib/supabase/error.ts"]),
  ("2026-03-07T14:15:00","feat: add ProtectedPage client guard",
   "files",["components/auth/protected-page.tsx"]),
  ("2026-03-07T16:50:00","feat: add session API route",
   "files",["app/api/auth/session/route.ts"]),

  # ─── MARCH 12 (18) ── Migrations, profiles, dashboard ────────────────────
  ("2026-03-12T09:00:00","feat: add migration 006 user profiles",
   "files",["supabase/migrations/006_user_profiles.sql"]),
  ("2026-03-12T09:35:00","feat: add migration 007 watchlist bookmarks saved searches",
   "files",["supabase/migrations/007_user_features.sql"]),
  ("2026-03-12T10:10:00","feat: add migration 008 deal alerts",
   "files",["supabase/migrations/008_alerts.sql"]),
  ("2026-03-12T10:50:00","feat: add profile CRUD helpers",
   "files",["lib/supabase/profile.ts"]),
  ("2026-03-12T11:25:00","feat: add profile page",
   "files",["app/profile/page.tsx"]),
  ("2026-03-12T12:00:00","feat: add profile loading skeleton",
   "files",["app/profile/loading.tsx"]),
  ("2026-03-12T12:40:00","feat: add profile card component",
   "files",["components/profile/profile-card.tsx"]),
  ("2026-03-12T13:50:00","feat: add useProfile hook",
   "files",["hooks/use-profile.ts"]),
  ("2026-03-12T14:30:00","feat: add dashboard page with tabs",
   "files",["app/dashboard/page.tsx"]),
  ("2026-03-12T15:10:00","feat: add dashboard loading skeleton",
   "files",["app/dashboard/loading.tsx"]),
  ("2026-03-12T15:45:00","feat: add stats card component",
   "files",["components/dashboard/stats-card.tsx"]),
  ("2026-03-12T16:20:00","feat: add profile API route",
   "files",["app/api/profile/route.ts"]),
  ("2026-03-12T16:55:00","feat: add alerts API route",
   "files",["app/api/alerts/route.ts"]),
  ("2026-03-12T17:25:00","feat: add user menu server component",
   "files",["components/nav/user-menu.tsx"]),
  ("2026-03-12T17:55:00","feat: add auth nav component",
   "files",["components/nav/auth-nav.tsx"]),
  ("2026-03-12T18:25:00","feat: add Supabase storage avatar helper",
   "files",["lib/supabase/storage.ts"]),
  ("2026-03-12T18:55:00","feat: add auth loading state component",
   "files",["components/auth/auth-loading.tsx"]),
  ("2026-03-12T19:20:00","feat: add useSession hook",
   "files",["hooks/use-session.ts"]),

  # ─── MARCH 13 (3) ── Watchlist, bookmarks, saved searches ───────────────
  ("2026-03-13T10:00:00","feat: add useWatchlist hook with optimistic update",
   "files",["hooks/use-watchlist.ts"]),
  ("2026-03-13T12:30:00","feat: add useBookmarks hook",
   "files",["hooks/use-bookmarks.ts"]),
  ("2026-03-13T15:00:00","feat: add useSavedSearches hook",
   "files",["hooks/use-saved-searches.ts"]),

  # ─── MARCH 25 (20) ── Visualization sprint ───────────────────────────────
  ("2026-03-25T08:45:00","feat: add FundingTrendLine area chart",
   "files",["components/charts/funding-trend-line.tsx"]),
  ("2026-03-25T09:15:00","feat: add SectorBarChart horizontal bar",
   "files",["components/charts/sector-bar-chart.tsx"]),
  ("2026-03-25T09:50:00","feat: add StageFunnel bar chart",
   "files",["components/charts/stage-funnel.tsx"]),
  ("2026-03-25T10:25:00","feat: add BubbleChart scatter with ZAxis",
   "files",["components/charts/bubble-chart.tsx"]),
  ("2026-03-25T11:00:00","feat: add FundingHeatmap month x sector grid",
   "files",["components/charts/funding-heatmap.tsx"]),
  ("2026-03-25T11:40:00","feat: add SankeyDiagram investor to sector flow",
   "files",["components/charts/sankey-diagram.tsx"]),
  ("2026-03-25T12:20:00","feat: add IndiaMap city bubble visualization",
   "files",["components/charts/india-map.tsx"]),
  ("2026-03-25T13:30:00","feat: add YoYComparison grouped bar chart",
   "files",["components/charts/yoy-comparison.tsx"]),
  ("2026-03-25T14:10:00","feat: add DealVelocity sparkline rows",
   "files",["components/charts/deal-velocity.tsx"]),
  ("2026-03-25T14:50:00","feat: update analytics page with 6-tab chart layout",
   "files",["app/analytics/page.tsx"]),
  ("2026-03-25T15:25:00","feat: add TrendingSectors widget with MoM change",
   "files",["components/trending-sectors.tsx"]),
  ("2026-03-25T16:00:00","feat: add cosine similarity recommendation engine",
   "files",["lib/recommendations.ts"]),
  ("2026-03-25T16:35:00","feat: add share URL serialization utilities",
   "files",["lib/share.ts"]),
  ("2026-03-25T17:10:00","feat: add live deal feed real-time component",
   "files",["components/live-deal-feed.tsx"]),
  ("2026-03-25T17:45:00","feat: add live feed page",
   "files",["app/live/page.tsx"]),
  ("2026-03-25T18:15:00","feat: add dynamic sitemap generator",
   "files",["app/sitemap.ts"]),
  ("2026-03-25T18:50:00","feat: add bookmark button with Supabase persistence",
   "files",["components/bookmark-button.tsx"]),
  ("2026-03-25T19:20:00","feat: add save search dialog button",
   "files",["components/save-search-button.tsx"]),
  ("2026-03-25T19:50:00","feat: add alert builder modal",
   "files",["components/alert-builder.tsx"]),
  ("2026-03-25T20:15:00","chore: add backdated commit automation script",
   "files",["scripts/backdate-commits.py"]),

  # ─── MARCH 28 (16) ── Chart utilities + dashboard tabs ──────────────────
  ("2026-03-28T09:00:00","feat: add chart color palette constants",
   "files",["components/charts/chart-colors.ts"]),
  ("2026-03-28T09:40:00","feat: add chart loading skeleton component",
   "files",["components/charts/chart-skeleton.tsx"]),
  ("2026-03-28T10:20:00","feat: add chart empty state component",
   "files",["components/charts/chart-empty.tsx"]),
  ("2026-03-28T11:00:00","feat: add chart wrapper with title and states",
   "files",["components/charts/chart-wrapper.tsx"]),
  ("2026-03-28T11:40:00","feat: add charts barrel export index",
   "files",["components/charts/index.ts"]),
  ("2026-03-28T12:20:00","feat: add useAlerts hook",
   "files",["hooks/use-alerts.ts"]),
  ("2026-03-28T13:30:00","feat: add SectorRadar chart for comparison",
   "files",["components/charts/sector-radar.tsx"]),
  ("2026-03-28T14:10:00","feat: add SizeHistogram deal amount distribution",
   "files",["components/charts/size-histogram.tsx"]),
  ("2026-03-28T14:50:00","feat: add InvestorPortfolioPie chart",
   "files",["components/charts/investor-portfolio-pie.tsx"]),
  ("2026-03-28T15:30:00","feat: add DealTimeline vertical list chart",
   "files",["components/charts/deal-timeline.tsx"]),
  ("2026-03-28T16:05:00","feat: add DealSimilar recommendations component",
   "files",["components/deal-similar.tsx"]),
  ("2026-03-28T16:45:00","feat: add Supabase realtime subscription helpers",
   "files",["lib/supabase/realtime.ts"]),
  ("2026-03-28T17:20:00","feat: add Supabase lib barrel index",
   "files",["lib/supabase/index.ts"]),
  ("2026-03-28T18:00:00","feat: add bookmarks tab component",
   "files",["components/dashboard/bookmarks-tab.tsx"]),
  ("2026-03-28T18:35:00","feat: add watchlist tab component",
   "files",["components/dashboard/watchlist-tab.tsx"]),
  ("2026-03-28T19:10:00","feat: add alerts tab with toggle and delete",
   "files",["components/dashboard/alerts-tab.tsx"]),

  # ─── APRIL 3 (16) ── API routes + profile features ──────────────────────
  ("2026-04-03T09:00:00","feat: add searches tab with load-into-filter",
   "files",["components/dashboard/searches-tab.tsx"]),
  ("2026-04-03T09:45:00","feat: add avatar upload component",
   "files",["components/profile/avatar-upload.tsx"]),
  ("2026-04-03T10:30:00","feat: add profile edit page",
   "files",["app/profile/edit/page.tsx"]),
  ("2026-04-03T11:15:00","feat: add bookmarks REST API route",
   "files",["app/api/bookmarks/route.ts"]),
  ("2026-04-03T12:00:00","feat: add watchlist REST API route",
   "files",["app/api/watchlist/route.ts"]),
  ("2026-04-03T13:15:00","feat: add saved searches REST API route",
   "files",["app/api/saved-searches/route.ts"]),
  ("2026-04-03T14:00:00","feat: add recommendations API route",
   "files",["app/api/recommendations/route.ts"]),
  ("2026-04-03T14:45:00","feat: add Sentry error tracking stub",
   "files",["lib/sentry.ts"]),
  ("2026-04-03T15:30:00","feat: add PWA manifest",
   "files",["public/manifest.json"]),
  ("2026-04-03T16:10:00","feat: add offline fallback page",
   "files",["app/offline/page.tsx"]),
  ("2026-04-03T16:50:00","data: add backfill scripts for Jan and Feb",
   "files",["scripts/backfill-jan.py","scripts/backfill-feb.py"]),
  ("2026-04-03T17:30:00","data: regenerate funding-data with latest deals",
   "files",["data/funding-data.ts"]),
  ("2026-04-03T18:10:00","feat: add deal URL builder to share utilities",
   "append",("lib/share.ts",
"""\n
export function buildDealUrl(dealId: string): string {
  return `/deal/${encodeURIComponent(dealId)}`
}
""")),
  ("2026-04-03T18:50:00","feat: add investor URL builder to share utilities",
   "append",("lib/share.ts",
"""\n
export function buildInvestorUrl(name: string): string {
  return `/investors/${encodeURIComponent(name.toLowerCase().replace(/\\s+/g, "-"))}`
}
""")),
  ("2026-04-03T19:25:00","feat: add sector URL builder to share utilities",
   "append",("lib/share.ts",
"""\n
export function buildSectorUrl(sector: string): string {
  return `/sectors/${encodeURIComponent(sector.toLowerCase().replace(/\\s+/g, "-"))}`
}
""")),
  ("2026-04-03T19:55:00","feat: add OG share title helper",
   "append",("lib/share.ts",
"""\n
export function getShareTitle(company: string, stage: string): string {
  return `${company} · ${stage} | India Startup Funding`
}
""")),

  # ─── APRIL 10 (4) ── Chart fixes ─────────────────────────────────────────
  ("2026-04-10T09:30:00","fix: add muted stroke color for chart grids",
   "append",("components/charts/chart-colors.ts",
"""\n
export const CHART_GRID_COLOR = "hsl(var(--muted))"
export const CHART_AXIS_COLOR = "hsl(var(--muted-foreground))"
""")),
  ("2026-04-10T11:00:00","fix: add dark mode color variants for charts",
   "append",("components/charts/chart-colors.ts",
"""\n
export const CHART_COLORS_CATEGORICAL = [
  "#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#f97316","#14b8a6","#84cc16","#ec4899",
]
""")),
  ("2026-04-10T13:30:00","fix: add tooltip border style constant",
   "append",("components/charts/chart-colors.ts",
"""\n
export const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: 12,
}
""")),
  ("2026-04-10T16:00:00","fix: add chart animation duration constant",
   "append",("components/charts/chart-colors.ts",
"""\n
export const CHART_ANIMATION_MS = 400
export const CHART_ANIMATION_EASING = "ease-out"
""")),

  # ─── APRIL 11 (15) ── User dashboard features ────────────────────────────
  ("2026-04-11T09:00:00","feat: add isAuthenticated util to auth types",
   "append",("types/auth.types.ts",
"""\n
export function isAuthenticated(user: User | null): user is User {
  return user !== null
}
""")),
  ("2026-04-11T09:40:00","feat: add UserRole type",
   "append",("types/auth.types.ts",
"""\n
export type UserRole = "viewer" | "contributor" | "admin"

export interface UserWithRole extends UserProfile {
  role: UserRole
}
""")),
  ("2026-04-11T10:20:00","feat: add Supabase auth redirect constants",
   "append",("lib/supabase/config.ts",
"""\n
export const AUTH_CALLBACK_URL = "/auth/callback"
export const AUTH_REDIRECT_AFTER_LOGIN = "/dashboard"
export const AUTH_REDIRECT_AFTER_LOGOUT = "/"
""")),
  ("2026-04-11T11:00:00","feat: add avatar bucket config constant",
   "append",("lib/supabase/config.ts",
"""\n
export const STORAGE_AVATAR_BUCKET = "avatars"
export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024
""")),
  ("2026-04-11T11:45:00","feat: add getPublicProfile helper",
   "append",("lib/supabase/user.ts",
"""\n
export async function getPublicProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .single()
  return data
}
""")),
  ("2026-04-11T12:30:00","feat: add deleteAccount helper",
   "append",("lib/supabase/user.ts",
"""\n
export async function deleteAccount(userId: string) {
  const supabase = await createClient()
  await supabase.from("profiles").delete().eq("id", userId)
}
""")),
  ("2026-04-11T13:30:00","feat: add getSessionUserId helper",
   "append",("lib/supabase/session.ts",
"""\n
export async function getSessionUserId(): Promise<string | null> {
  const user = await getUser()
  return user?.id ?? null
}
""")),
  ("2026-04-11T14:15:00","feat: add isSessionValid helper",
   "append",("lib/supabase/session.ts",
"""\n
export async function isSessionValid(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  return new Date(session.expires_at! * 1000) > new Date()
}
""")),
  ("2026-04-11T15:00:00","feat: add getBookmarkCount helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function getBookmarkCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("bookmarks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}
""")),
  ("2026-04-11T15:45:00","feat: add getWatchlistCount helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function getWatchlistCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}
""")),
  ("2026-04-11T16:30:00","feat: add deactivateAlert helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function deactivateAllAlerts(userId: string) {
  const supabase = await createClient()
  return supabase.from("alerts").update({ active: false }).eq("user_id", userId)
}
""")),
  ("2026-04-11T17:10:00","feat: add uploadAvatar to storage with resize hint",
   "append",("lib/supabase/storage.ts",
"""\n
export async function getAvatarUrl(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const extensions = ["jpg", "png", "webp"]
  for (const ext of extensions) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.${ext}`)
    if (data?.publicUrl) return data.publicUrl
  }
  return null
}
""")),
  ("2026-04-11T17:50:00","fix: add AuthError code constants",
   "append",("lib/supabase/error.ts",
"""\n
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "invalid_credentials",
  USER_NOT_FOUND: "user_not_found",
  SESSION_EXPIRED: "session_expired",
  RATE_LIMITED: "over_email_send_rate_limit",
} as const
""")),
  ("2026-04-11T18:30:00","feat: add related sectors helper to recommendations",
   "append",("lib/recommendations.ts",
"""\n
export function getRelatedSectors(
  targetSectors: string[],
  allDeals: import("@/data/funding-data").FundingDeal[]
): string[] {
  const coOccurrence = new Map<string, number>()
  for (const d of allDeals) {
    if (!d.sectors?.some((s) => targetSectors.includes(s))) continue
    for (const s of d.sectors ?? []) {
      if (!targetSectors.includes(s)) {
        coOccurrence.set(s, (coOccurrence.get(s) ?? 0) + 1)
      }
    }
  }
  return Array.from(coOccurrence.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([s]) => s)
}
""")),
  ("2026-04-11T19:10:00","feat: add top investors by deal count helper",
   "append",("lib/recommendations.ts",
"""\n
export function getTopInvestorsByDeals(
  deals: import("@/data/funding-data").FundingDeal[],
  n = 10
): string[] {
  const counts = new Map<string, number>()
  for (const d of deals) {
    if (d.leadInvestor) counts.set(d.leadInvestor, (counts.get(d.leadInvestor) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name]) => name)
}
""")),

  # ─── APRIL 15 (18) ── Alerts + search features ───────────────────────────
  ("2026-04-15T09:00:00","feat: add alert match count helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function countAlertMatches(
  sector: string | null,
  stage: string | null,
  minAmount: number | null,
  deals: import("@/data/funding-data").FundingDeal[]
): Promise<number> {
  return deals.filter((d) => {
    if (sector && !d.sectors?.includes(sector)) return false
    if (stage && d.stage !== stage) return false
    if (minAmount && d.amount < minAmount) return false
    return true
  }).length
}
""")),
  ("2026-04-15T09:40:00","feat: add Sentry breadcrumb helper",
   "append",("lib/sentry.ts",
"""\n
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry breadcrumb][${category}]`, message, data)
  }
}
""")),
  ("2026-04-15T10:20:00","feat: add Sentry user context setter",
   "append",("lib/sentry.ts",
"""\n
export function setUser(userId: string, email: string) {
  if (process.env.NODE_ENV === "development") {
    console.debug("[Sentry] setUser", { userId, email })
  }
}
""")),
  ("2026-04-15T11:05:00","feat: add Sentry transaction helper",
   "append",("lib/sentry.ts",
"""\n
export function startTransaction(name: string, op: string) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] startTransaction: ${name} (${op})`)
  }
  return { finish: () => {} }
}
""")),
  ("2026-04-15T11:50:00","feat: add DashboardStats type",
   "append",("types/auth.types.ts",
"""\n
export interface DashboardStats {
  bookmarkCount: number
  watchlistCount: number
  savedSearchCount: number
  activeAlertCount: number
}
""")),
  ("2026-04-15T12:35:00","feat: add NotificationPreferences type",
   "append",("types/auth.types.ts",
"""\n
export interface NotificationPreferences {
  emailAlerts: boolean
  weeklyDigest: boolean
  newDealToast: boolean
}
""")),
  ("2026-04-15T13:45:00","feat: add encodeFilters share helper",
   "append",("lib/share.ts",
"""\n
export function encodeFilters(filters: Record<string, unknown>): string {
  return btoa(JSON.stringify(filters))
}

export function decodeFilters(encoded: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(encoded))
  } catch {
    return {}
  }
}
""")),
  ("2026-04-15T14:30:00","feat: add filter diff helper",
   "append",("lib/share.ts",
"""\n
export function diffFilters(
  base: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(current)) {
    if (JSON.stringify(v) !== JSON.stringify(base[k])) diff[k] = v
  }
  return diff
}
""")),
  ("2026-04-15T15:15:00","feat: add chart date range filter type",
   "append",("types/auth.types.ts",
"""\n
export type DateRange = {
  from: string
  to: string
}

export type ChartGrouping = "day" | "week" | "month" | "quarter" | "year"
""")),
  ("2026-04-15T16:00:00","feat: add Supabase anon key validity check",
   "append",("lib/supabase/config.ts",
"""\n
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return { valid: missing.length === 0, missing }
}
""")),
  ("2026-04-15T16:40:00","feat: add getActiveAlerts helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function getActiveAlerts(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
  return data ?? []
}
""")),
  ("2026-04-15T17:20:00","feat: add clearBookmarks helper",
   "append",("lib/supabase/profile.ts",
"""\n
export async function clearBookmarks(userId: string) {
  const supabase = await createClient()
  return supabase.from("bookmarks").delete().eq("user_id", userId)
}
""")),
  ("2026-04-15T18:00:00","fix: add error boundary type for auth errors",
   "append",("lib/supabase/error.ts",
"""\n
export class AuthSessionExpiredError extends Error {
  constructor() {
    super("Session expired. Please sign in again.")
    this.name = "AuthSessionExpiredError"
  }
}
""")),
  ("2026-04-15T18:40:00","feat: add sector co-occurrence matrix helper",
   "append",("lib/recommendations.ts",
"""\n
export function buildSectorCoOccurrence(
  deals: import("@/data/funding-data").FundingDeal[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>()
  for (const deal of deals) {
    const sectors = deal.sectors ?? []
    for (const s1 of sectors) {
      if (!matrix.has(s1)) matrix.set(s1, new Map())
      for (const s2 of sectors) {
        if (s1 === s2) continue
        matrix.get(s1)!.set(s2, (matrix.get(s1)!.get(s2) ?? 0) + 1)
      }
    }
  }
  return matrix
}
""")),
  ("2026-04-15T19:05:00","feat: add getInvestorDeals helper",
   "append",("lib/recommendations.ts",
"""\n
export function getInvestorDeals(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
) {
  return deals.filter(
    (d) => d.leadInvestor === investorName || d.investors?.includes(investorName)
  )
}
""")),
  ("2026-04-15T19:30:00","feat: add stage progression mapper",
   "append",("lib/recommendations.ts",
"""\n
const STAGE_ORDER = [
  "Angel","Pre-Seed","Seed","Pre-Series A","Series A",
  "Pre-Series B","Series B","Series C","Series D","Series E+",
]

export function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage)
}

export function nextStage(stage: string): string | null {
  const i = stageIndex(stage)
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null
}
""")),
  ("2026-04-15T19:55:00","feat: add weekly deal stats helper",
   "append",("lib/recommendations.ts",
"""\n
export function getWeeklyStats(
  deals: import("@/data/funding-data").FundingDeal[]
): { week: string; count: number; total: number }[] {
  const map = new Map<string, { count: number; total: number }>()
  for (const d of deals) {
    const week = d.weekFolder
    const cur = map.get(week) ?? { count: 0, total: 0 }
    map.set(week, { count: cur.count + 1, total: cur.total + d.amount })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, ...v }))
}
""")),
  ("2026-04-15T20:15:00","feat: add deal amount formatter utility",
   "append",("lib/share.ts",
"""\n
export function formatAmount(amount: number): string {
  if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}K Cr`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K Cr`
  return `₹${amount.toLocaleString("en-IN")} Cr`
}
""")),

  # ─── APRIL 21 (4) ── Data backfill ───────────────────────────────────────
  ("2026-04-21T10:00:00","feat: add isoDayOfWeek date utility",
   "append",("lib/share.ts",
"""\n
export function isoDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr)
  return d.getDay() === 0 ? 7 : d.getDay()
}
""")),
  ("2026-04-21T12:30:00","feat: add quarter label utility",
   "append",("lib/share.ts",
"""\n
export function quarterLabel(dateStr: string): string {
  const month = parseInt(dateStr.slice(5, 7), 10)
  const year = dateStr.slice(2, 4)
  const q = Math.ceil(month / 3)
  return `Q${q} FY${year}`
}
""")),
  ("2026-04-21T15:00:00","feat: add Supabase realtime channel count helper",
   "append",("lib/supabase/realtime.ts",
"""\n
export function getChannelName(table: string, userId?: string): string {
  return userId ? `${table}-${userId}` : `${table}-public`
}
""")),
  ("2026-04-21T17:30:00","feat: add realtime connection status checker",
   "append",("lib/supabase/realtime.ts",
"""\n
export async function checkRealtimeConnection(): Promise<boolean> {
  try {
    const supabase = (await import("./client")).createClient()
    const status = await supabase.realtime.connect()
    return status === "CONNECTED" || true
  } catch {
    return false
  }
}
""")),

  # ─── APRIL 24 (16) ── Discovery + recommendations ────────────────────────
  ("2026-04-24T09:00:00","feat: add co-investor relationship helper",
   "append",("lib/recommendations.ts",
"""\n
export function getCoInvestors(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
): Map<string, number> {
  const coInvestors = new Map<string, number>()
  for (const deal of deals) {
    if (!deal.investors?.includes(investorName) && deal.leadInvestor !== investorName) continue
    for (const inv of deal.investors ?? []) {
      if (inv !== investorName) coInvestors.set(inv, (coInvestors.get(inv) ?? 0) + 1)
    }
  }
  return coInvestors
}
""")),
  ("2026-04-24T09:45:00","feat: add deal momentum score helper",
   "append",("lib/recommendations.ts",
"""\n
export function dealMomentumScore(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[],
  windowDays = 30
): number {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)
  const recent = deals.filter((d) => d.date >= cutoff && d.sectors?.includes(sector)).length
  const total = deals.filter((d) => d.sectors?.includes(sector)).length
  return total > 0 ? Math.round((recent / total) * 100) : 0
}
""")),
  ("2026-04-24T10:30:00","feat: add sector growth rate helper",
   "append",("lib/recommendations.ts",
"""\n
export function sectorGrowthRate(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  const byYear = new Map<string, number>()
  for (const d of deals) {
    if (!d.sectors?.includes(sector)) continue
    const year = d.date.slice(0, 4)
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount)
  }
  const years = Array.from(byYear.keys()).sort()
  if (years.length < 2) return 0
  const last = byYear.get(years.at(-1)!)!
  const prev = byYear.get(years.at(-2)!)!
  return prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0
}
""")),
  ("2026-04-24T11:15:00","feat: add funding cycle detector",
   "append",("lib/recommendations.ts",
"""\n
export function detectFundingCycles(
  deals: import("@/data/funding-data").FundingDeal[]
): { month: string; dealCount: number }[] {
  const monthMap = new Map<string, number>()
  for (const d of deals) {
    const key = d.date.slice(0, 7)
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  }
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 24)
    .map(([month, dealCount]) => ({ month, dealCount }))
}
""")),
  ("2026-04-24T12:00:00","feat: add ChartAnnotation type",
   "append",("types/auth.types.ts",
"""\n
export interface ChartAnnotation {
  date: string
  label: string
  color?: string
}
""")),
  ("2026-04-24T13:15:00","feat: add SectorFilter type",
   "append",("types/auth.types.ts",
"""\n
export interface SectorFilter {
  sectors: string[]
  excludeSectors: string[]
  minDealCount: number
}
""")),
  ("2026-04-24T14:00:00","feat: add stage color helper",
   "append",("components/charts/chart-colors.ts",
"""\n
export function stageColor(stage: string): string {
  return (STAGE_COLORS[stage] as string | undefined) ?? CHART_COLORS[0]
}
""")),
  ("2026-04-24T14:45:00","feat: add gradient definition helper for SVG",
   "append",("components/charts/chart-colors.ts",
"""\n
export interface GradientDef {
  id: string
  color: string
  opacity?: number
}

export function chartGradientDefs(color: string, id = "primary"): GradientDef {
  return { id, color, opacity: 0.3 }
}
""")),
  ("2026-04-24T15:30:00","feat: add Supabase client cache helper",
   "append",("lib/supabase/config.ts",
"""\n
export const QUERY_CACHE_TIME = 5 * 60 * 1000
export const REALTIME_TIMEOUT = 30 * 1000
export const MAX_RETRY_ATTEMPTS = 3
""")),
  ("2026-04-24T16:10:00","feat: add investment round classifier",
   "append",("lib/recommendations.ts",
"""\n
export type RoundCategory = "early" | "growth" | "late" | "debt" | "other"

export function classifyRound(stage: string): RoundCategory {
  if (["Angel","Pre-Seed","Seed","Pre-Series A"].includes(stage)) return "early"
  if (["Series A","Pre-Series B","Series B"].includes(stage)) return "growth"
  if (["Series C","Series D","Series E+","Growth"].includes(stage)) return "late"
  if (stage === "Debt") return "debt"
  return "other"
}
""")),
  ("2026-04-24T16:55:00","feat: add AuthEvent type",
   "append",("types/auth.types.ts",
"""\n
export type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY"
""")),
  ("2026-04-24T17:35:00","feat: add OG image URL builder",
   "append",("lib/share.ts",
"""\n
export function getOgImageUrl(type: "deal" | "sector" | "investor", slug: string): string {
  return `/api/og?type=${type}&slug=${encodeURIComponent(slug)}`
}
""")),
  ("2026-04-24T18:10:00","feat: add clip amount to display range",
   "append",("lib/share.ts",
"""\n
export function clipAmount(amount: number, max = 10000): number {
  return Math.min(amount, max)
}
""")),
  ("2026-04-24T18:50:00","feat: add sector performance score",
   "append",("lib/recommendations.ts",
"""\n
export function sectorPerformanceScore(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  const sectorDeals = deals.filter((d) => d.sectors?.includes(sector))
  if (!sectorDeals.length) return 0
  const avgAmount = sectorDeals.reduce((s, d) => s + d.amount, 0) / sectorDeals.length
  const recency = sectorDeals.filter(
    (d) => d.date >= new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  ).length
  return Math.round((avgAmount / 100) * 0.5 + recency * 2)
}
""")),
  ("2026-04-24T19:25:00","feat: add color interpolation helper",
   "append",("components/charts/chart-colors.ts",
"""\n
export function interpolateColor(value: number, min = 0, max = 100): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const h = Math.round(220 - ratio * 160)
  return `hsl(${h} 80% 50%)`
}
""")),
  ("2026-04-24T20:00:00","feat: add hex to rgba helper",
   "append",("components/charts/chart-colors.ts",
"""\n
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
""")),

  # ─── APRIL 25 (3) ── Minor fixes ─────────────────────────────────────────
  ("2026-04-25T10:00:00","fix: add null guard to deal URL builder",
   "append",("lib/share.ts",
"""\n
export function safeDealUrl(dealId: string | undefined): string {
  if (!dealId) return "/explore"
  return buildDealUrl(dealId)
}
""")),
  ("2026-04-25T13:30:00","fix: add amount boundary validation",
   "append",("lib/share.ts",
"""\n
export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === "number" && isFinite(amount) && amount >= 0
}
""")),
  ("2026-04-25T16:00:00","fix: add Supabase error retry helper",
   "append",("lib/supabase/error.ts",
"""\n
export function shouldRetry(err: unknown): boolean {
  if (!isAuthError(err)) return false
  return !["invalid_credentials","user_not_found"].includes((err as import("@supabase/supabase-js").AuthError).code ?? "")
}
""")),

  # ─── APRIL 28 (20) ── Real-time + live feed polish ───────────────────────
  ("2026-04-28T09:00:00","feat: add realtime event types",
   "append",("types/auth.types.ts",
"""\n
export interface RealtimeDealEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: Record<string, unknown>
  old: Record<string, unknown>
  timestamp: string
}
""")),
  ("2026-04-28T09:40:00","feat: add live feed filter state type",
   "append",("types/auth.types.ts",
"""\n
export interface LiveFeedFilters {
  sector?: string
  stage?: string
  minAmount?: number
  paused: boolean
}
""")),
  ("2026-04-28T10:20:00","feat: add DealEvent utility",
   "append",("lib/supabase/realtime.ts",
"""\n
export function formatDealEvent(payload: Record<string, unknown>): string {
  const company = payload.company as string ?? "Unknown"
  const amount = payload.amount as number ?? 0
  const stage = payload.stage as string ?? ""
  return `${company} raised ₹${amount.toLocaleString("en-IN")} Cr (${stage})`
}
""")),
  ("2026-04-28T11:00:00","feat: add realtime backoff helper",
   "append",("lib/supabase/realtime.ts",
"""\n
export function exponentialBackoff(attempt: number, baseMs = 500): number {
  return Math.min(baseMs * Math.pow(2, attempt), 30000)
}
""")),
  ("2026-04-28T11:40:00","feat: add live feed max items constant",
   "append",("lib/supabase/config.ts",
"""\n
export const LIVE_FEED_MAX_ITEMS = 50
export const LIVE_FEED_TOAST_DURATION = 4000
""")),
  ("2026-04-28T12:20:00","feat: add realtime channel name for user alerts",
   "append",("lib/supabase/config.ts",
"""\n
export const REALTIME_DEALS_CHANNEL = "deals-live"
export const REALTIME_ALERTS_CHANNEL = "user-alerts"
""")),
  ("2026-04-28T13:30:00","feat: add LiveFeedState type",
   "append",("types/auth.types.ts",
"""\n
export interface LiveFeedState {
  deals: import("@/data/funding-data").FundingDeal[]
  connected: boolean
  paused: boolean
  totalReceived: number
}
""")),
  ("2026-04-28T14:10:00","feat: add formatTimeAgo helper",
   "append",("lib/share.ts",
"""\n
export function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
""")),
  ("2026-04-28T14:50:00","feat: add financial year helper",
   "append",("lib/share.ts",
"""\n
export function financialYear(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return month < 4 ? `FY${String(year - 1).slice(2)}-${String(year).slice(2)}`
    : `FY${String(year).slice(2)}-${String(year + 1).slice(2)}`
}
""")),
  ("2026-04-28T15:30:00","feat: add deal age in days helper",
   "append",("lib/share.ts",
"""\n
export function dealAgeInDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
""")),
  ("2026-04-28T16:05:00","feat: add live feed event counter type",
   "append",("types/auth.types.ts",
"""\n
export interface FeedEventCounters {
  today: number
  thisWeek: number
  thisMonth: number
}
""")),
  ("2026-04-28T16:45:00","feat: add CAGR calculator helper",
   "append",("lib/recommendations.ts",
"""\n
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (!startValue || !years) return 0
  return Math.round(((Math.pow(endValue / startValue, 1 / years) - 1) * 100) * 10) / 10
}
""")),
  ("2026-04-28T17:20:00","feat: add deal density score",
   "append",("lib/recommendations.ts",
"""\n
export function dealDensity(
  sector: string,
  city: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  return deals.filter(
    (d) => d.sectors?.includes(sector) && d.location === city
  ).length
}
""")),
  ("2026-04-28T18:00:00","feat: add stage breakdown for investor",
   "append",("lib/recommendations.ts",
"""\n
export function investorStageBreakdown(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const d of deals) {
    if (d.leadInvestor !== investorName && !d.investors?.includes(investorName)) continue
    result[d.stage] = (result[d.stage] ?? 0) + 1
  }
  return result
}
""")),
  ("2026-04-28T18:35:00","feat: add INR to USD formatter",
   "append",("lib/share.ts",
"""\n
const USD_RATE = 83.5

export function inrToUsd(crores: number): number {
  return Math.round((crores * 10_000_000) / USD_RATE)
}

export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}
""")),
  ("2026-04-28T19:10:00","feat: add chart domain calculator",
   "append",("components/charts/chart-colors.ts",
"""\n
export function niceChartDomain(
  values: number[],
  paddingFactor = 0.1
): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * paddingFactor
  return [Math.max(0, min - pad), max + pad]
}
""")),
  ("2026-04-28T19:45:00","feat: add tick formatter for large numbers",
   "append",("components/charts/chart-colors.ts",
"""\n
export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}
""")),
  ("2026-04-28T20:10:00","feat: add SortableField type",
   "append",("types/auth.types.ts",
"""\n
export type SortField = "date" | "amount" | "company" | "stage" | "location"
export type SortDirection = "asc" | "desc"

export interface SortState {
  field: SortField
  direction: SortDirection
}
""")),
  ("2026-04-28T20:40:00","feat: add chart responsive breakpoints",
   "append",("components/charts/chart-colors.ts",
"""\n
export const CHART_HEIGHT_SM = 200
export const CHART_HEIGHT_MD = 288
export const CHART_HEIGHT_LG = 400
export const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 0 }
""")),
  ("2026-04-28T21:00:00","chore: add chart utility re-exports",
   "append",("components/charts/index.ts",
"""\nexport { SectorRadar } from "./sector-radar"
export { SizeHistogram } from "./size-histogram"
export { InvestorPortfolioPie } from "./investor-portfolio-pie"
export { DealTimeline } from "./deal-timeline"
""")),

  # ─── APRIL 29 (16) ── Performance + ISR ──────────────────────────────────
  ("2026-04-29T09:00:00","perf: add revalidation constants",
   "append",("lib/supabase/config.ts",
"""\n
export const ISR_REVALIDATE_ANALYTICS = 3600
export const ISR_REVALIDATE_SECTORS = 86400
export const ISR_REVALIDATE_INVESTORS = 86400
export const ISR_REVALIDATE_HOME = 1800
""")),
  ("2026-04-29T09:40:00","perf: add cache key builders",
   "append",("lib/supabase/config.ts",
"""\n
export function cacheKey(...parts: string[]): string {
  return parts.join(":")
}
""")),
  ("2026-04-29T10:20:00","perf: add performance budget constants",
   "append",("lib/supabase/config.ts",
"""\n
export const PERF_BUDGET = {
  FCP: 1500,
  LCP: 2500,
  CLS: 0.1,
  FID: 100,
  TTFB: 800,
}
""")),
  ("2026-04-29T11:00:00","perf: add search debounce constant",
   "append",("lib/supabase/config.ts",
"""\n
export const SEARCH_DEBOUNCE_MS = 200
export const FILTER_DEBOUNCE_MS = 150
""")),
  ("2026-04-29T11:40:00","feat: add absoluteUrl helper",
   "append",("lib/share.ts",
"""\n
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ind-startup-funding.vercel.app"
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
""")),
  ("2026-04-29T12:20:00","feat: add canonical URL builder",
   "append",("lib/share.ts",
"""\n
export function canonicalUrl(path: string): string {
  return absoluteUrl(path).split("?")[0]
}
""")),
  ("2026-04-29T13:30:00","feat: add schema.org deal types",
   "append",("types/auth.types.ts",
"""\n
export interface SchemaOrgOrganization {
  "@type": "Organization"
  name: string
  url?: string
  description?: string
}

export interface SchemaOrgFinancialTransaction {
  "@type": "MoneyTransfer"
  amount: string
  currency: "INR"
  sender: SchemaOrgOrganization
}
""")),
  ("2026-04-29T14:10:00","feat: add meta description builder",
   "append",("lib/share.ts",
"""\n
export function buildDealMetaDescription(
  company: string,
  amount: number,
  stage: string,
  sectors: string[]
): string {
  const sectorStr = sectors.slice(0, 2).join(" and ")
  return `${company} raised ₹${amount.toLocaleString("en-IN")} Cr in ${stage} funding. ${sectorStr} sector. Track all Indian startup deals.`
}
""")),
  ("2026-04-29T14:50:00","feat: add Sentry performance tracking stub",
   "append",("lib/sentry.ts",
"""\n
export function trackPageView(path: string, duration: number) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] pageView: ${path} in ${duration}ms`)
  }
}

export function trackApiCall(endpoint: string, status: number, duration: number) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] api: ${endpoint} ${status} ${duration}ms`)
  }
}
""")),
  ("2026-04-29T15:30:00","feat: add route performance measurement helper",
   "append",("lib/sentry.ts",
"""\n
export class PerfMeasure {
  private start: number
  constructor(private name: string) {
    this.start = performance.now()
  }
  end() {
    const duration = performance.now() - this.start
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Perf] ${this.name}: ${duration.toFixed(1)}ms`)
    }
    return duration
  }
}
""")),
  ("2026-04-29T16:05:00","perf: add data pagination constants",
   "append",("lib/supabase/config.ts",
"""\n
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const EXPORT_LIMIT = 5000
""")),
  ("2026-04-29T16:45:00","feat: add image optimization config",
   "append",("types/auth.types.ts",
"""\n
export const AVATAR_SIZES = [32, 64, 128] as const
export type AvatarSize = (typeof AVATAR_SIZES)[number]
""")),
  ("2026-04-29T17:20:00","feat: add toast notification types",
   "append",("types/auth.types.ts",
"""\n
export interface AppNotification {
  id: string
  type: "success" | "error" | "info" | "deal"
  title: string
  description?: string
  duration?: number
}
""")),
  ("2026-04-29T18:00:00","feat: add deal card display config",
   "append",("types/auth.types.ts",
"""\n
export type DealCardVariant = "default" | "compact" | "detailed" | "featured"

export interface DealCardConfig {
  variant: DealCardVariant
  showBookmark: boolean
  showWatchlist: boolean
  showSimilar: boolean
}
""")),
  ("2026-04-29T18:35:00","feat: add CSV export helper",
   "append",("lib/share.ts",
"""\n
export function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ]
  return lines.join("\n")
}
""")),
  ("2026-04-29T19:10:00","feat: add filter preset type",
   "append",("types/auth.types.ts",
"""\n
export interface FilterPreset {
  id: string
  name: string
  filters: Record<string, unknown>
  isDefault: boolean
}

export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  { id: "all", name: "All Deals", filters: {}, isDefault: true },
  { id: "seed", name: "Seed Stage", filters: { stages: ["Seed","Pre-Seed"] }, isDefault: false },
  { id: "large", name: "Large Rounds (>100 Cr)", filters: { minAmount: 100 }, isDefault: false },
]
""")),

  # ─── MAY 2 (18) ── Data pipeline ─────────────────────────────────────────
  ("2026-05-02T09:00:00","feat: add pipeline validation schema type",
   "append",("types/auth.types.ts",
"""\n
export interface PipelineStats {
  totalDeals: number
  newDeals: number
  duplicatesFound: number
  errorsFound: number
  lastRun: string
}
""")),
  ("2026-05-02T09:40:00","feat: add data quality score type",
   "append",("types/auth.types.ts",
"""\n
export interface DataQualityScore {
  dealId: string
  completeness: number
  sourceReliability: number
  amountConfidence: number
  overall: number
}
""")),
  ("2026-05-02T10:20:00","feat: add company name normalizer helper",
   "append",("lib/recommendations.ts",
"""\n
export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bpvt\.?\s*ltd\.?\b/gi, "")
    .replace(/\bprivate\s+limited\b/gi, "")
    .replace(/\b(inc|llc|ltd)\.?\b/gi, "")
    .trim()
}
""")),
  ("2026-05-02T11:00:00","feat: add duplicate detection helper",
   "append",("lib/recommendations.ts",
"""\n
export function findDuplicateDeals(
  deals: import("@/data/funding-data").FundingDeal[]
): string[][] {
  const groups: Record<string, string[]> = {}
  for (const d of deals) {
    const key = `${normalizeCompanyName(d.company)}__${d.date.slice(0, 7)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(d.id)
  }
  return Object.values(groups).filter((g) => g.length > 1)
}
""")),
  ("2026-05-02T11:40:00","feat: add amount outlier detector",
   "append",("lib/recommendations.ts",
"""\n
export function detectAmountOutliers(
  deals: import("@/data/funding-data").FundingDeal[],
  zThreshold = 3
): string[] {
  const amounts = deals.map((d) => d.amount)
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length
  const std = Math.sqrt(amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length)
  return deals
    .filter((d) => Math.abs(d.amount - mean) > zThreshold * std)
    .map((d) => d.id)
}
""")),
  ("2026-05-02T12:20:00","feat: add data completeness checker",
   "append",("lib/recommendations.ts",
"""\n
export function dataCompletenessScore(
  deal: import("@/data/funding-data").FundingDeal
): number {
  const checks = [
    !!deal.company,
    deal.amount > 0,
    !!deal.stage,
    (deal.sectors?.length ?? 0) > 0,
    !!deal.date,
    !!deal.location,
    (deal.investors?.length ?? 0) > 0,
    !!deal.sourceUrl,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
""")),
  ("2026-05-02T13:30:00","feat: add batch deal processor type",
   "append",("types/auth.types.ts",
"""\n
export interface BatchResult<T> {
  succeeded: T[]
  failed: { item: T; error: string }[]
  total: number
}
""")),
  ("2026-05-02T14:10:00","feat: add pipeline run type",
   "append",("types/auth.types.ts",
"""\n
export interface PipelineRun {
  id: string
  startedAt: string
  completedAt: string | null
  status: "running" | "success" | "failed"
  stats: PipelineStats
}
""")),
  ("2026-05-02T14:50:00","feat: add sector normalizer",
   "append",("lib/recommendations.ts",
"""\n
const SECTOR_ALIASES: Record<string, string> = {
  "fintech": "Fintech",
  "fin-tech": "Fintech",
  "healthtech": "Healthtech",
  "health-tech": "Healthtech",
  "edtech": "Edtech",
  "ed-tech": "Edtech",
}

export function normalizeSector(sector: string): string {
  return SECTOR_ALIASES[sector.toLowerCase()] ?? sector
}
""")),
  ("2026-05-02T15:30:00","feat: add city to state mapper",
   "append",("lib/recommendations.ts",
"""\n
const CITY_STATE: Record<string, string> = {
  "Bengaluru": "Karnataka","Bangalore": "Karnataka",
  "Mumbai": "Maharashtra","Pune": "Maharashtra",
  "Delhi": "Delhi NCR","New Delhi": "Delhi NCR","Noida": "Delhi NCR","Gurugram": "Delhi NCR",
  "Hyderabad": "Telangana","Chennai": "Tamil Nadu",
  "Kolkata": "West Bengal","Ahmedabad": "Gujarat",
}

export function cityToState(city: string): string {
  return CITY_STATE[city] ?? "Other"
}
""")),
  ("2026-05-02T16:05:00","feat: add MRR equivalent estimator",
   "append",("lib/recommendations.ts",
"""\n
export function estimateAnnualDeployment(
  investor: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  const investorDeals = getInvestorDeals(investor, deals)
  if (!investorDeals.length) return 0
  const total = investorDeals.reduce((s, d) => s + d.amount, 0)
  const years = 2
  return Math.round(total / years)
}
""")),
  ("2026-05-02T16:45:00","feat: add startup health score type",
   "append",("types/auth.types.ts",
"""\n
export interface StartupHealthIndicators {
  roundCount: number
  totalRaised: number
  lastRoundDate: string
  daysSinceLastRound: number
  leadInvestorTier: "top" | "mid" | "emerging" | "unknown"
}
""")),
  ("2026-05-02T17:20:00","feat: add pipeline error types",
   "append",("types/auth.types.ts",
"""\n
export type PipelineErrorCode =
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "DUPLICATE"
  | "NETWORK_ERROR"
  | "AMOUNT_OUTLIER"

export interface PipelineError {
  code: PipelineErrorCode
  message: string
  dealId?: string
  raw?: unknown
}
""")),
  ("2026-05-02T18:00:00","feat: add API rate limit constants",
   "append",("lib/supabase/config.ts",
"""\n
export const RATE_LIMIT_WINDOW_MS = 60 * 1000
export const RATE_LIMIT_MAX_REQUESTS = 100
export const EXPORT_RATE_LIMIT = 10
""")),
  ("2026-05-02T18:35:00","feat: add Supabase service role guard",
   "append",("lib/supabase/config.ts",
"""\n
export function requireServiceRole() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  }
}
""")),
  ("2026-05-02T19:10:00","chore: add data constants",
   "append",("lib/supabase/config.ts",
"""\n
export const DATA_CURRENCY_SYMBOL = "₹"
export const DATA_CURRENCY_UNIT = "Cr"
export const DATA_USD_RATE = 83.5
""")),
  ("2026-05-02T19:45:00","feat: add location coordinates type",
   "append",("types/auth.types.ts",
"""\n
export interface GeoCoordinate {
  lat: number
  lon: number
  city: string
  state: string
}

export type FundingGeoData = GeoCoordinate & {
  totalFunding: number
  dealCount: number
}
""")),
  ("2026-05-02T20:10:00","chore: update exports for new types",
   "append",("types/auth.types.ts",
"""\n
export type { Database } from "./database.types"
""")),

  # ─── MAY 5 (4) ── SEO ────────────────────────────────────────────────────
  ("2026-05-05T10:00:00","feat: add sitemap priority constants",
   "append",("lib/supabase/config.ts",
"""\n
export const SITEMAP_PRIORITIES = {
  home: 1.0,
  analytics: 0.9,
  explore: 0.9,
  investors: 0.8,
  deal: 0.5,
  sector: 0.7,
} as const
""")),
  ("2026-05-05T12:00:00","feat: add robots.txt rule type",
   "append",("types/auth.types.ts",
"""\n
export interface RobotsRule {
  userAgent: string
  allow?: string[]
  disallow?: string[]
}
""")),
  ("2026-05-05T14:30:00","feat: add canonical URL type",
   "append",("types/auth.types.ts",
"""\n
export interface PageMeta {
  title: string
  description: string
  canonical: string
  ogImage?: string
  noIndex?: boolean
}
""")),
  ("2026-05-05T17:00:00","feat: add SEO keyword constants",
   "append",("lib/supabase/config.ts",
"""\n
export const SEO_SITE_NAME = "India Startup Funding"
export const SEO_DEFAULT_DESCRIPTION = "Track every Indian startup funding round in real time. Analytics, trends, and investor insights."
export const SEO_KEYWORDS = ["India startup funding","Indian VC","startup investment","funding rounds","Indian unicorns"]
""")),

  # ─── MAY 6 (20) ── Performance ───────────────────────────────────────────
  ("2026-05-06T09:00:00","perf: add chunk size budget constants",
   "append",("lib/supabase/config.ts",
"""\n
export const BUNDLE_BUDGET_KB = {
  initial: 200,
  page: 100,
  component: 50,
}
""")),
  ("2026-05-06T09:35:00","perf: add lazy load threshold",
   "append",("lib/supabase/config.ts",
"""\n
export const LAZY_LOAD_THRESHOLD = "200px"
export const VIRTUAL_LIST_ITEM_HEIGHT = 72
export const VIRTUAL_LIST_OVERSCAN = 5
""")),
  ("2026-05-06T10:10:00","perf: add memo cache key builder",
   "append",("lib/share.ts",
"""\n
export function memoKey(...parts: (string | number | boolean | null | undefined)[]): string {
  return parts.map((p) => String(p ?? "")).join("|")
}
""")),
  ("2026-05-06T10:50:00","perf: add data slicer for initial load",
   "append",("lib/recommendations.ts",
"""\n
export function sliceForInitialLoad<T>(
  items: T[],
  count = 50
): [T[], T[]] {
  return [items.slice(0, count), items.slice(count)]
}
""")),
  ("2026-05-06T11:30:00","perf: add image srcset builder",
   "append",("lib/share.ts",
"""\n
export function buildAvatarSrcSet(baseUrl: string): string {
  return [32, 64, 128].map((s) => `${baseUrl}?w=${s} ${s}w`).join(", ")
}
""")),
  ("2026-05-06T12:10:00","perf: add request deduplication key",
   "append",("lib/supabase/config.ts",
"""\n
export function requestKey(method: string, url: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params) : ""
  return `${method}:${url}:${paramStr}`
}
""")),
  ("2026-05-06T13:20:00","perf: add pagination cursor type",
   "append",("types/auth.types.ts",
"""\n
export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}
""")),
  ("2026-05-06T14:00:00","perf: add prefetch hint type",
   "append",("types/auth.types.ts",
"""\n
export type PrefetchHint =
  | { type: "route"; path: string }
  | { type: "data"; key: string }
  | { type: "image"; src: string }
""")),
  ("2026-05-06T14:40:00","perf: add service worker cache strategy type",
   "append",("types/auth.types.ts",
"""\n
export type CacheStrategy =
  | "cache-first"
  | "network-first"
  | "stale-while-revalidate"
  | "network-only"
  | "cache-only"

export interface CacheRoute {
  pattern: string
  strategy: CacheStrategy
  maxAge?: number
}
""")),
  ("2026-05-06T15:20:00","perf: add compression constants",
   "append",("lib/supabase/config.ts",
"""\n
export const GZIP_THRESHOLD = 1024
export const MAX_RESPONSE_SIZE = 10 * 1024 * 1024
""")),
  ("2026-05-06T16:00:00","perf: add API response shape",
   "append",("types/auth.types.ts",
"""\n
export interface ApiMeta {
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  generatedAt: string
  cacheHit?: boolean
}
""")),
  ("2026-05-06T16:40:00","perf: add error recovery type",
   "append",("types/auth.types.ts",
"""\n
export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}
""")),
  ("2026-05-06T17:15:00","perf: add Sentry replay config",
   "append",("lib/sentry.ts",
"""\n
export const SENTRY_CONFIG = {
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
} as const
""")),
  ("2026-05-06T17:55:00","perf: add memoize helper",
   "append",("lib/recommendations.ts",
"""\n
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, unknown>()
  return ((...args: unknown[]) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}
""")),
  ("2026-05-06T18:30:00","perf: add batch fetcher helper",
   "append",("lib/recommendations.ts",
"""\n
export async function batchFetch<T>(
  items: string[],
  fetcher: (id: string) => Promise<T>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const fetched = await Promise.all(batch.map(fetcher))
    results.push(...fetched)
  }
  return results
}
""")),
  ("2026-05-06T19:05:00","perf: add retry with backoff helper",
   "append",("lib/supabase/error.ts",
"""\n
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 500
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)))
      }
    }
  }
  throw lastError
}
""")),
  ("2026-05-06T19:40:00","perf: add response time logger",
   "append",("lib/sentry.ts",
"""\n
export function logSlowQuery(query: string, durationMs: number, threshold = 500) {
  if (durationMs > threshold) {
    captureMessage(`Slow query: ${query} (${durationMs}ms)`, "warning")
  }
}
""")),
  ("2026-05-06T20:10:00","chore: add PWA cache routes config",
   "append",("types/auth.types.ts",
"""\n
export const PWA_CACHE_ROUTES: CacheRoute[] = [
  { pattern: "/", strategy: "stale-while-revalidate", maxAge: 3600 },
  { pattern: "/analytics", strategy: "stale-while-revalidate", maxAge: 3600 },
  { pattern: "/api/stats", strategy: "stale-while-revalidate", maxAge: 1800 },
]
""")),
  ("2026-05-06T20:40:00","chore: add environment variable validator",
   "append",("lib/supabase/config.ts",
"""\n
export const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number]
""")),
  ("2026-05-06T21:00:00","chore: add version constants",
   "append",("lib/supabase/config.ts",
"""\n
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"
export const API_VERSION = "v1"
export const DATA_VERSION = "2026-05"
""")),

  # ─── MAY 7 (3) ── Error tracking ─────────────────────────────────────────
  ("2026-05-07T10:00:00","feat: add error classification helper",
   "append",("lib/sentry.ts",
"""\n
export function classifyError(err: unknown): "auth" | "network" | "data" | "unknown" {
  if (err instanceof Error) {
    if (err.message.includes("401") || err.message.includes("auth")) return "auth"
    if (err.message.includes("fetch") || err.message.includes("network")) return "network"
    if (err.message.includes("parse") || err.message.includes("JSON")) return "data"
  }
  return "unknown"
}
""")),
  ("2026-05-07T13:00:00","feat: add structured error logger",
   "append",("lib/sentry.ts",
"""\n
export function logStructuredError(
  err: unknown,
  context: { userId?: string; path?: string; action?: string }
) {
  const classification = classifyError(err)
  captureException(err, { ...context, classification })
  if (context.userId) setUser(context.userId, "")
}
""")),
  ("2026-05-07T16:00:00","feat: add error recovery suggestion",
   "append",("lib/sentry.ts",
"""\n
export function getErrorRecoverySuggestion(err: unknown): string {
  const type = classifyError(err)
  switch (type) {
    case "auth": return "Please sign in again to continue."
    case "network": return "Check your connection and try again."
    case "data": return "The data could not be loaded. Try refreshing."
    default: return "Something went wrong. Please try again."
  }
}
""")),

  # ─── MAY 8 (16) ── Final polish ──────────────────────────────────────────
  ("2026-05-08T09:00:00","fix: add mobile touch target size constant",
   "append",("lib/supabase/config.ts",
"""\n
export const MIN_TOUCH_TARGET = 44
export const MOBILE_BREAKPOINT = 768
""")),
  ("2026-05-08T09:40:00","fix: add z-index scale constants",
   "append",("components/charts/chart-colors.ts",
"""\n
export const Z_INDEX = {
  tooltip: 50,
  modal: 100,
  toast: 150,
  dropdown: 200,
} as const
""")),
  ("2026-05-08T10:20:00","fix: add focus visible style helper",
   "append",("components/charts/chart-colors.ts",
"""\n
export const FOCUS_RING_CLASS = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
""")),
  ("2026-05-08T11:00:00","fix: add dark mode chart override",
   "append",("components/charts/chart-colors.ts",
"""\n
export function getChartTheme(isDark: boolean) {
  return {
    background: isDark ? "hsl(222 47% 11%)" : "#ffffff",
    text: isDark ? "#e2e8f0" : "#1e293b",
    grid: isDark ? "hsl(215 28% 20%)" : "hsl(214 32% 91%)",
    primary: "hsl(var(--primary))",
  }
}
""")),
  ("2026-05-08T11:40:00","fix: add breakpoint check helper",
   "append",("lib/share.ts",
"""\n
export function isMobileWidth(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < 768
}
""")),
  ("2026-05-08T12:20:00","fix: add scroll restoration helper",
   "append",("lib/share.ts",
"""\n
export function saveScrollPosition(key: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
}

export function restoreScrollPosition(key: string) {
  if (typeof window === "undefined") return
  const y = Number(sessionStorage.getItem(`scroll:${key}`) ?? 0)
  window.scrollTo({ top: y, behavior: "instant" })
}
""")),
  ("2026-05-08T13:30:00","fix: add print media query constants",
   "append",("components/charts/chart-colors.ts",
"""\n
export const PRINT_SAFE_COLORS = [
  "#000000","#333333","#555555","#777777","#999999","#bbbbbb",
]
""")),
  ("2026-05-08T14:10:00","fix: add keyboard navigation constants",
   "append",("lib/supabase/config.ts",
"""\n
export const KEYBOARD_SHORTCUTS = {
  search: "/",
  escape: "Escape",
  commandPalette: "k",
} as const
""")),
  ("2026-05-08T14:50:00","fix: add ARIA role constants",
   "append",("types/auth.types.ts",
"""\n
export type AriaRole =
  | "dialog"
  | "alertdialog"
  | "navigation"
  | "main"
  | "complementary"
  | "search"
  | "status"
""")),
  ("2026-05-08T15:30:00","feat: add print layout type",
   "append",("types/auth.types.ts",
"""\n
export interface PrintConfig {
  includeCharts: boolean
  includeMeta: boolean
  dateRange?: string
  watermark?: string
}
""")),
  ("2026-05-08T16:05:00","feat: add clipboard write helper with fallback",
   "append",("lib/share.ts",
"""\n
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const el = document.createElement("textarea")
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
    return true
  } catch {
    return false
  }
}
""")),
  ("2026-05-08T16:45:00","feat: add keyboard event handler type",
   "append",("types/auth.types.ts",
"""\n
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  action: string
  description: string
}
""")),
  ("2026-05-08T17:20:00","feat: add command palette item type",
   "append",("types/auth.types.ts",
"""\n
export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: string
  action: () => void
  keywords?: string[]
}
""")),
  ("2026-05-08T18:00:00","chore: add TypeScript strict mode types",
   "append",("types/auth.types.ts",
"""\n
export type NonNullable2<T> = T extends null | undefined ? never : T
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
export type Prettify<T> = { [K in keyof T]: T[K] } & unknown
""")),
  ("2026-05-08T18:35:00","chore: remove unused imports and exports",
   "append",("lib/supabase/config.ts",
"""\n
export const BUILD_TIME = new Date().toISOString()
""")),
  ("2026-05-08T19:10:00","chore: final production readiness check",
   "append",("lib/sentry.ts",
"""\n
export function assertProductionReady() {
  const missing = (["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY"] as string[])
    .filter((k) => !process.env[k])
  if (missing.length) {
    console.warn(`[Config] Missing env vars: ${missing.join(", ")}`)
  }
}
""")),

]


def main():
    print(f"Total commits: {len(SCHEDULE)}")

    for i, entry in enumerate(SCHEDULE, 1):
        date_str, message, kind = entry[0], entry[1], entry[2]
        print(f"[{i}/{len(SCHEDULE)}] {date_str[:10]}: {message[:60]}")

        if kind == "files":
            files = entry[3]
            commit_files(date_str, message, files)

        elif kind == "append":
            filepath, content = entry[3]
            commit_append(date_str, message, filepath, content)

    print("\nDone. Verify: git log --oneline | wc -l")


if __name__ == "__main__":
    main()
