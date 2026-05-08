export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)


export const AUTH_CALLBACK_URL = "/auth/callback"
export const AUTH_REDIRECT_AFTER_LOGIN = "/dashboard"
export const AUTH_REDIRECT_AFTER_LOGOUT = "/"


export const STORAGE_AVATAR_BUCKET = "avatars"
export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024


export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return { valid: missing.length === 0, missing }
}


export const QUERY_CACHE_TIME = 5 * 60 * 1000
export const REALTIME_TIMEOUT = 30 * 1000
export const MAX_RETRY_ATTEMPTS = 3


export const LIVE_FEED_MAX_ITEMS = 50
export const LIVE_FEED_TOAST_DURATION = 4000


export const REALTIME_DEALS_CHANNEL = "deals-live"
export const REALTIME_ALERTS_CHANNEL = "user-alerts"


export const ISR_REVALIDATE_ANALYTICS = 3600
export const ISR_REVALIDATE_SECTORS = 86400
export const ISR_REVALIDATE_INVESTORS = 86400
export const ISR_REVALIDATE_HOME = 1800


export function cacheKey(...parts: string[]): string {
  return parts.join(":")
}


export const PERF_BUDGET = {
  FCP: 1500,
  LCP: 2500,
  CLS: 0.1,
  FID: 100,
  TTFB: 800,
}


export const SEARCH_DEBOUNCE_MS = 200
export const FILTER_DEBOUNCE_MS = 150


export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const EXPORT_LIMIT = 5000


export const RATE_LIMIT_WINDOW_MS = 60 * 1000
export const RATE_LIMIT_MAX_REQUESTS = 100
export const EXPORT_RATE_LIMIT = 10


export function requireServiceRole() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  }
}


export const DATA_CURRENCY_SYMBOL = "₹"
export const DATA_CURRENCY_UNIT = "Cr"
export const DATA_USD_RATE = 83.5


export const SITEMAP_PRIORITIES = {
  home: 1.0,
  analytics: 0.9,
  explore: 0.9,
  investors: 0.8,
  deal: 0.5,
  sector: 0.7,
} as const


export const SEO_SITE_NAME = "India Startup Funding"
export const SEO_DEFAULT_DESCRIPTION = "Track every Indian startup funding round in real time. Analytics, trends, and investor insights."
export const SEO_KEYWORDS = ["India startup funding","Indian VC","startup investment","funding rounds","Indian unicorns"]


export const BUNDLE_BUDGET_KB = {
  initial: 200,
  page: 100,
  component: 50,
}


export const LAZY_LOAD_THRESHOLD = "200px"
export const VIRTUAL_LIST_ITEM_HEIGHT = 72
export const VIRTUAL_LIST_OVERSCAN = 5


export function requestKey(method: string, url: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params) : ""
  return `${method}:${url}:${paramStr}`
}


export const GZIP_THRESHOLD = 1024
export const MAX_RESPONSE_SIZE = 10 * 1024 * 1024


export const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number]


export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"
export const API_VERSION = "v1"
export const DATA_VERSION = "2026-05"


export const MIN_TOUCH_TARGET = 44
export const MOBILE_BREAKPOINT = 768


export const KEYBOARD_SHORTCUTS = {
  search: "/",
  escape: "Escape",
  commandPalette: "k",
} as const
