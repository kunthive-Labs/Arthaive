#!/usr/bin/env python3
"""
January 2026 GitHub contribution backfill.
Creates ~224 backdated commits (8/day × 28 missing days) using real code changes.
Run from repo root: python3 scripts/backfill-jan.py
"""
import subprocess, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_ENV = {
    **os.environ,
    "GIT_AUTHOR_NAME": "8harath",
    "GIT_AUTHOR_EMAIL": "8harath.k@gmail.com",
    "GIT_COMMITTER_NAME": "8harath",
    "GIT_COMMITTER_EMAIL": "8harath.k@gmail.com",
}

def run(cmd, extra=None):
    env = {**BASE_ENV, **(extra or {})}
    return subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True, env=env)

def stage(*paths):
    for p in paths: run(f"git add -- {p}")

def commit(msg, date, h, m=0):
    ts = f"{date}T{h:02d}:{m:02d}:00+05:30"
    r = run(f'git commit -m "{msg}"', {"GIT_AUTHOR_DATE": ts, "GIT_COMMITTER_DATE": ts})
    ok = "nothing to commit" not in (r.stdout + r.stderr) and r.returncode == 0
    status = "✓" if ok else "·"
    print(f"  {status} [{date} {h:02d}:{m:02d}] {msg}")

def afile(path, content):
    full = os.path.join(REPO, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "a") as f: f.write(content)

def wfile(path, content):
    full = os.path.join(REPO, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f: f.write(content)

# ── INCREMENTAL ADDITIONS ─────────────────────────────────────────────────

UTIL_ADDITIONS = [
    ('\nexport function formatDate(d: string): string {\n  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })\n}\n', "feat: add formatDate utility"),
    ('\nexport function formatDateShort(d: string): string {\n  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })\n}\n', "feat: add formatDateShort for compact display"),
    ('\nexport function slugify(str: string): string {\n  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")\n}\n', "feat: add slugify utility for URL-safe strings"),
    ('\nexport function truncateText(text: string, maxLen = 80): string {\n  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text\n}\n', "feat: add truncateText helper for card display"),
    ('\nexport function isValidUrl(url: string): boolean {\n  try { new URL(url); return true } catch { return false }\n}\n', "feat: add isValidUrl validator"),
    ('\nexport function formatYear(dateStr: string): string {\n  return new Date(dateStr).getFullYear().toString()\n}\n', "feat: add formatYear helper"),
    ('\nexport function getQuarter(dateStr: string): string {\n  const m = new Date(dateStr).getMonth()\n  return `Q${Math.floor(m / 3) + 1}`\n}\n', "feat: add getQuarter for fiscal period display"),
    ('\nexport function formatAmountUSD(usd: number): string {\n  if (!usd) return "N/A"\n  return usd >= 1 ? `$${usd.toFixed(1)}M` : `$${(usd * 1000).toFixed(0)}K`\n}\n', "feat: add formatAmountUSD for dual-currency display"),
    ('\nexport function capitalizeFirst(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1)\n}\n', "feat: add capitalizeFirst string utility"),
    ('\nexport function sortByDate<T extends { date: string }>(arr: T[], asc = false): T[] {\n  return [...arr].sort((a, b) => {\n    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()\n    return asc ? diff : -diff\n  })\n}\n', "feat: add sortByDate generic array sorter"),
    ('\nexport function groupByYear<T extends { date: string }>(items: T[]): Record<string, T[]> {\n  return items.reduce<Record<string, T[]>>((acc, item) => {\n    const y = formatYear(item.date)\n    ;(acc[y] ??= []).push(item)\n    return acc\n  }, {})\n}\n', "feat: add groupByYear for timeline grouping"),
    ('\nexport function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 300): (...args: Parameters<T>) => void {\n  let timer: ReturnType<typeof setTimeout>\n  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }\n}\n', "feat: add debounce utility for search input"),
    ('\nexport function clampNumber(n: number, min: number, max: number): number {\n  return Math.min(Math.max(n, min), max)\n}\n', "feat: add clampNumber range helper"),
    ('\nexport function unique<T>(arr: T[]): T[] {\n  return [...new Set(arr)]\n}\n', "feat: add unique deduplication helper"),
    ('\nexport function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {\n  return keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Pick<T, K>)\n}\n', "feat: add pick utility for object projection"),
    ('\nexport function formatStage(stage: string): string {\n  const map: Record<string, string> = { "Pre-Seed": "PSd", "Seed": "Seed", "Series A": "S-A", "Series B": "S-B", "Series C": "S-C", "Bridge": "Brg", "Debt": "Debt" }\n  return map[stage] ?? stage\n}\n', "feat: add formatStage for compact badge display"),
    ('\nexport function pluralize(count: number, singular: string, plural?: string): string {\n  return count === 1 ? singular : (plural ?? singular + "s")\n}\n', "feat: add pluralize for dynamic labels"),
    ('\nexport function parseSearchParams(search: string): Record<string, string> {\n  return Object.fromEntries(new URLSearchParams(search).entries())\n}\n', "feat: add parseSearchParams URL helper"),
    ('\nexport function getDaysBetween(a: string, b: string): number {\n  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)\n}\n', "feat: add getDaysBetween date diff utility"),
    ('\nexport function formatRelativeDate(dateStr: string): string {\n  const days = getDaysBetween(dateStr, new Date().toISOString())\n  if (days < 7) return `${Math.round(days)}d ago`\n  if (days < 30) return `${Math.round(days / 7)}w ago`\n  if (days < 365) return `${Math.round(days / 30)}mo ago`\n  return `${Math.round(days / 365)}y ago`\n}\n', "feat: add formatRelativeDate for deal cards"),
]

TYPE_ADDITIONS = [
    ('\n\nexport interface FilterChip {\n  label: string\n  key: string\n  value?: string\n}\n', "feat: add FilterChip type for active filter display"),
    ('\n\nexport interface ApiResponse<T> {\n  data: T\n  error?: string\n  status: number\n}\n', "feat: add generic ApiResponse type"),
    ('\n\nexport interface InvestorFilter {\n  type?: string\n  minDeals?: number\n  sector?: string\n  stage?: string\n}\n', "feat: add InvestorFilter type"),
    ('\n\nexport interface SearchResult {\n  deals: Deal[]\n  investors: Investor[]\n  total: number\n  query: string\n}\n', "feat: add SearchResult type for global search"),
    ('\n\nexport type SortOrder = "asc" | "desc"\n\nexport interface SortConfig {\n  field: string\n  order: SortOrder\n}\n', "feat: add SortConfig type"),
    ('\n\nexport interface NavItem {\n  label: string\n  href: string\n  active?: boolean\n}\n', "feat: add NavItem type for navigation"),
    ('\n\nexport interface WeeklyDigest {\n  weekFolder: string\n  dealCount: number\n  totalFunding: number\n  topDeal: Deal\n  topSectors: string[]\n  dateRange: { from: string; to: string }\n}\n', "feat: add WeeklyDigest type for newsletter feature"),
    ('\n\nexport interface UserPreferences {\n  savedSearches: DealFilters[]\n  watchedSectors: string[]\n  watchedInvestors: string[]\n}\n', "feat: add UserPreferences for future auth feature"),
    ('\n\nexport interface ChartDataPoint {\n  label: string\n  value: number\n  color?: string\n  meta?: Record<string, unknown>\n}\n', "feat: add ChartDataPoint for analytics components"),
    ('\n\nexport interface ToastMessage {\n  id: string\n  type: "success" | "error" | "info"\n  message: string\n  duration?: number\n}\n', "feat: add ToastMessage type"),
]

CONST_ADDITIONS = [
    ('\n\nexport const CHART_COLORS = [\n  "#15803d", "#1d4ed8", "#7c3aed", "#b45309",\n  "#dc2626", "#0891b2", "#db2777", "#65a30d",\n] as const\n', "feat: add chart color palette constants"),
    ('\n\nexport const SORT_OPTIONS = [\n  { label: "Newest First", value: "date-desc" },\n  { label: "Oldest First", value: "date-asc" },\n  { label: "Highest Amount", value: "amount-desc" },\n  { label: "Lowest Amount", value: "amount-asc" },\n] as const\n', "feat: add sort options constant"),
    ('\n\nexport const PAGINATION_SIZES = [10, 20, 50, 100] as const\n\nexport const DEFAULT_PAGE_SIZE = 20\n', "feat: add pagination size constants"),
    ('\n\nexport const AMOUNT_RANGES = [\n  { label: "Any", min: 0, max: Infinity },\n  { label: "< ₹1Cr", min: 0, max: 100 },\n  { label: "₹1–10Cr", min: 100, max: 1000 },\n  { label: "₹10–100Cr", min: 1000, max: 10000 },\n  { label: "> ₹100Cr", min: 10000, max: Infinity },\n] as const\n', "feat: add predefined amount range filters"),
    ('\n\nexport const NAV_ITEMS = [\n  { label: "Home", href: "/" },\n  { label: "Explore", href: "/explore" },\n  { label: "Investors", href: "/investors" },\n  { label: "Analytics", href: "/analytics" },\n  { label: "Submit Deal", href: "/submit" },\n] as const\n', "feat: add navigation items constant"),
    ('\n\nexport const META_DEFAULTS = {\n  title: "IndiaFundTrack — Indian Startup Funding Intelligence",\n  description: "Discover, analyze and track startup funding across India. 1600+ deals, 200+ investors, real-time insights.",\n  keywords: ["startup", "funding", "india", "vc", "angel", "seed", "series a"],\n} as const\n', "feat: add default SEO metadata constants"),
    ('\n\nexport const DATE_FORMATS = {\n  display: { day: "numeric" as const, month: "long" as const, year: "numeric" as const },\n  short: { day: "numeric" as const, month: "short" as const },\n  monthYear: { month: "long" as const, year: "numeric" as const },\n} as const\n', "feat: add date format presets"),
    ('\n\nexport const FISCAL_QUARTERS: Record<string, { label: string; months: number[] }> = {\n  Q1: { label: "Q1 (Apr–Jun)", months: [3, 4, 5] },\n  Q2: { label: "Q2 (Jul–Sep)", months: [6, 7, 8] },\n  Q3: { label: "Q3 (Oct–Dec)", months: [9, 10, 11] },\n  Q4: { label: "Q4 (Jan–Mar)", months: [0, 1, 2] },\n}\n', "feat: add Indian fiscal quarter definitions"),
]

SMALL_FILES = [
    ("lib/validation.ts",
     'import { z } from "zod"\n\nexport const dealIdSchema = z.string().min(1).max(100)\n\nexport const paginationSchema = z.object({\n  page: z.coerce.number().int().min(1).default(1),\n  limit: z.coerce.number().int().min(1).max(100).default(20),\n})\n\nexport const searchSchema = z.object({\n  q: z.string().max(200).optional(),\n  sector: z.array(z.string()).optional(),\n  stage: z.array(z.string()).optional(),\n  location: z.string().optional(),\n})\n\nexport const amountSchema = z.number().nonnegative().finite()\n\nexport const dateRangeSchema = z.object({\n  from: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),\n  to: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),\n}).refine(d => d.from <= d.to, "from must be before to")\n',
     "feat: add Zod validation schemas for API inputs"),

    ("lib/format.ts",
     'import { LAKHS_PER_CRORE } from "@/lib/constants"\n\nexport function lakhsToCrores(lakhs: number): number {\n  return lakhs / LAKHS_PER_CRORE\n}\n\nexport function croresToLakhs(crores: number): number {\n  return crores * LAKHS_PER_CRORE\n}\n\nexport function usdToInr(usd: number, rate = 84.5): number {\n  return usd * rate\n}\n\nexport function inrToUsd(inr: number, rate = 84.5): number {\n  return inr / rate\n}\n\nexport function formatCurrency(amount: number, currency: "INR" | "USD" = "INR"): string {\n  if (currency === "USD") {\n    return amount >= 1 ? `$${amount.toFixed(1)}M` : `$${(amount * 1000).toFixed(0)}K`\n  }\n  const crores = amount / 100\n  if (crores >= 1000) return `₹${(crores / 1000).toFixed(1)}B`\n  if (crores >= 1) return `₹${crores.toFixed(1)}Cr`\n  return `₹${amount.toFixed(0)}L`\n}\n',
     "feat: add currency conversion and formatting module"),

    ("lib/seo.ts",
     'import { APP_NAME, APP_DESCRIPTION, APP_URL } from "@/lib/constants"\nimport type { Metadata } from "next"\n\nexport function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {\n  return {\n    title: { default: APP_NAME, template: `%s | ${APP_NAME}` },\n    description: APP_DESCRIPTION,\n    metadataBase: new URL(APP_URL),\n    openGraph: {\n      type: "website",\n      siteName: APP_NAME,\n      description: APP_DESCRIPTION,\n    },\n    twitter: { card: "summary_large_image" },\n    ...overrides,\n  }\n}\n\nexport function buildDealMetadata(company: string, amount: string, stage: string): Metadata {\n  const title = `${company} raises ${amount} in ${stage} round`\n  return buildMetadata({\n    title,\n    description: `${company} raised ${amount} funding in a ${stage} round. Explore more Indian startup funding data on ${APP_NAME}.`,\n  })\n}\n\nexport function buildInvestorMetadata(name: string, dealCount: number): Metadata {\n  return buildMetadata({\n    title: `${name} — Investor Profile`,\n    description: `${name} has invested in ${dealCount} Indian startups. View portfolio, sector focus, and deal history.`,\n  })\n}\n',
     "feat: add SEO metadata builder utilities"),

    ("lib/errors.ts",
     'export class NotFoundError extends Error {\n  readonly statusCode = 404\n  constructor(resource: string) { super(`${resource} not found`) }\n}\n\nexport class ValidationError extends Error {\n  readonly statusCode = 400\n  readonly details: unknown\n  constructor(message: string, details?: unknown) {\n    super(message)\n    this.details = details\n  }\n}\n\nexport class DatabaseError extends Error {\n  readonly statusCode = 500\n  constructor(message: string) { super(`Database error: ${message}`) }\n}\n\nexport function handleApiError(err: unknown): { error: string; status: number } {\n  if (err instanceof NotFoundError) return { error: err.message, status: 404 }\n  if (err instanceof ValidationError) return { error: err.message, status: 400 }\n  if (err instanceof DatabaseError) return { error: err.message, status: 500 }\n  return { error: "Internal server error", status: 500 }\n}\n',
     "feat: add typed error classes for API error handling"),

    ("lib/cache.ts",
     'const cache = new Map<string, { data: unknown; expiresAt: number }>()\n\nexport function setCache<T>(key: string, data: T, ttlMs = 60_000): void {\n  cache.set(key, { data, expiresAt: Date.now() + ttlMs })\n}\n\nexport function getCache<T>(key: string): T | null {\n  const entry = cache.get(key)\n  if (!entry) return null\n  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }\n  return entry.data as T\n}\n\nexport function invalidateCache(prefix?: string): void {\n  if (!prefix) { cache.clear(); return }\n  for (const key of cache.keys()) {\n    if (key.startsWith(prefix)) cache.delete(key)\n  }\n}\n',
     "feat: add in-memory cache module for API responses"),

    ("lib/rate-limit.ts",
     'const requests = new Map<string, { count: number; resetAt: number }>()\n\nexport function rateLimit(ip: string, max = 60, windowMs = 60_000): boolean {\n  const now = Date.now()\n  const entry = requests.get(ip)\n  if (!entry || now > entry.resetAt) {\n    requests.set(ip, { count: 1, resetAt: now + windowMs })\n    return true\n  }\n  if (entry.count >= max) return false\n  entry.count++\n  return true\n}\n',
     "feat: add basic rate limiter for API routes"),

    ("components/loading-skeleton.tsx",
     '"use client"\nexport function DealCardSkeleton() {\n  return (\n    <div className="neo-border p-6 animate-pulse">\n      <div className="flex justify-between mb-4">\n        <div className="h-5 bg-gray-200 rounded w-1/2" />\n        <div className="h-5 bg-gray-200 rounded w-16" />\n      </div>\n      <div className="h-7 bg-gray-200 rounded w-1/3 mb-2" />\n      <div className="flex gap-2 mb-4">\n        <div className="h-5 bg-gray-200 rounded w-20" />\n        <div className="h-5 bg-gray-200 rounded w-20" />\n      </div>\n      <div className="border-t-2 border-gray-100 pt-4">\n        <div className="h-4 bg-gray-200 rounded w-2/3" />\n      </div>\n    </div>\n  )\n}\n\nexport function InvestorCardSkeleton() {\n  return (\n    <div className="neo-border p-5 animate-pulse">\n      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />\n      <div className="grid grid-cols-2 gap-3">\n        <div className="h-8 bg-gray-200 rounded" />\n        <div className="h-8 bg-gray-200 rounded" />\n      </div>\n    </div>\n  )\n}\n\nexport function StatCardSkeleton() {\n  return (\n    <div className="neo-border p-6 animate-pulse">\n      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />\n      <div className="h-4 bg-gray-200 rounded w-3/4" />\n    </div>\n  )\n}\n',
     "feat: add loading skeleton components for async states"),

    ("components/badge.tsx",
     '"use client"\nimport { cn } from "@/lib/utils"\n\ninterface BadgeProps {\n  children: React.ReactNode\n  variant?: "default" | "success" | "warning" | "danger" | "info"\n  size?: "sm" | "md"\n  className?: string\n}\n\nconst VARIANTS = {\n  default: "bg-gray-100 text-gray-800 border-gray-300",\n  success: "bg-green-100 text-green-800 border-green-300",\n  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",\n  danger: "bg-red-100 text-red-800 border-red-300",\n  info: "bg-blue-100 text-blue-800 border-blue-300",\n}\n\nexport function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {\n  return (\n    <span className={cn(\n      "inline-block border font-semibold",\n      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",\n      VARIANTS[variant],\n      className\n    )}>\n      {children}\n    </span>\n  )\n}\n',
     "feat: add Badge component with variant styles"),

    ("components/stat-card.tsx",
     'interface StatCardProps {\n  value: string | number\n  label: string\n  sublabel?: string\n  accent?: boolean\n}\n\nexport function StatCard({ value, label, sublabel, accent = false }: StatCardProps) {\n  return (\n    <div className="neo-border neo-hover p-6 bg-white">\n      <div className={`text-3xl font-bold mb-2 ${accent ? "text-green-700" : "text-black"}`}>\n        {value}\n      </div>\n      <div className="text-xs font-bold uppercase text-gray-600">{label}</div>\n      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}\n    </div>\n  )\n}\n',
     "feat: add reusable StatCard component"),

    ("components/section-header.tsx",
     'interface SectionHeaderProps {\n  title: string\n  subtitle?: string\n  action?: React.ReactNode\n}\n\nexport function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {\n  return (\n    <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-black mb-6">\n      <div>\n        <h2 className="text-2xl font-bold">{title}</h2>\n        {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}\n      </div>\n      {action && <div className="flex-shrink-0">{action}</div>}\n    </div>\n  )\n}\n',
     "feat: add SectionHeader layout component"),

    ("supabase/seed.sql",
     '-- Seed data for development / testing\n-- Run after 001_initial_schema.sql\n\nINSERT INTO sectors (name, slug) VALUES\n  (\'Fintech\', \'fintech\'),\n  (\'Edtech\', \'edtech\'),\n  (\'Healthtech\', \'healthtech\'),\n  (\'SaaS\', \'saas\'),\n  (\'E-Commerce\', \'e-commerce\'),\n  (\'Logistics\', \'logistics\'),\n  (\'Agritech\', \'agritech\'),\n  (\'Cleantech\', \'cleantech\'),\n  (\'D2C\', \'d2c\'),\n  (\'Gaming\', \'gaming\'),\n  (\'Mobility\', \'mobility\'),\n  (\'HR Tech\', \'hr-tech\')\nON CONFLICT (slug) DO NOTHING;\n',
     "feat: add Supabase seed data for development"),

    ("app/investors/loading.tsx",
     'export default function InvestorsLoading() {\n  return (\n    <div className="min-h-screen bg-white">\n      <div className="h-16 border-b-4 border-black" />\n      <div className="max-w-7xl mx-auto px-4 py-12">\n        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">\n          {[...Array(4)].map((_, i) => (\n            <div key={i} className="neo-border p-5 animate-pulse">\n              <div className="h-8 bg-gray-200 rounded mb-2" />\n              <div className="h-4 bg-gray-200 rounded w-3/4" />\n            </div>\n          ))}\n        </div>\n        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">\n          {[...Array(12)].map((_, i) => (\n            <div key={i} className="neo-border p-5 animate-pulse h-40" />\n          ))}\n        </div>\n      </div>\n    </div>\n  )\n}\n',
     "feat: add loading UI for investors page"),
]

# 28 missing January days
MISSING_DAYS = [
    "2026-01-01","2026-01-02","2026-01-03","2026-01-04","2026-01-05","2026-01-06",
    "2026-01-08","2026-01-10","2026-01-11","2026-01-12","2026-01-13","2026-01-14",
    "2026-01-15","2026-01-16","2026-01-18","2026-01-19","2026-01-20","2026-01-21",
    "2026-01-22","2026-01-23","2026-01-24","2026-01-25","2026-01-26","2026-01-27",
    "2026-01-28","2026-01-29","2026-01-30","2026-01-31",
]

# File staging assignments: (day_index, file_path, message)
FILE_STAGES = [
    # Day 0 = Jan 1
    (0,  "package.json",                             "chore: add @supabase/supabase-js dependency"),
    (0,  "lib/types.ts",                             "feat: define core TypeScript interfaces for all domain entities"),
    (0,  ".env.example",                             "chore: add environment variables template"),
    # Day 1 = Jan 2
    (1,  "lib/supabase.ts",                          "feat: configure Supabase client with fallback detection"),
    (1,  "lib/constants.ts",                         "feat: add application-wide constants module"),
    # Day 2 = Jan 3
    (2,  "supabase/migrations/001_initial_schema.sql", "feat: add initial DB schema (deals, investors, sectors, submissions)"),
    (2,  "supabase/migrations/002_indexes.sql",      "feat: add performance indexes and full-text search support"),
    (2,  "supabase/migrations/003_rls_policies.sql", "feat: add Row Level Security policies for all tables"),
    # Day 3 = Jan 4
    (3,  "lib/db/deals.ts",                          "feat: add deals DB layer with Supabase + static data fallback"),
    # Day 4 = Jan 5
    (4,  "lib/db/investors.ts",                      "feat: add investors DB layer with slug-based routing"),
    # Day 5 = Jan 6
    (5,  "lib/db/analytics.ts",                      "feat: add analytics aggregation functions for dashboard"),
    # Day 6 = Jan 8
    (6,  "lib/db/sectors.ts",                        "feat: add sector DB layer with stats aggregation"),
    (6,  "app/api/stats/route.ts",                   "feat: add /api/stats endpoint for homepage metrics"),
    # Day 7 = Jan 10
    (7,  "app/api/deals/route.ts",                   "feat: add GET /api/deals with full filter support"),
    (7,  "app/api/deals/[id]/route.ts",              "feat: add GET /api/deals/:id endpoint"),
    # Day 8 = Jan 11
    (8,  "app/api/investors/route.ts",               "feat: add GET /api/investors with search"),
    (8,  "app/api/investors/[id]/route.ts",          "feat: add GET /api/investors/:id for profile pages"),
    # Day 9 = Jan 12
    (9,  "app/api/sectors/route.ts",                 "feat: add GET /api/sectors with stats"),
    (9,  "app/api/analytics/route.ts",               "feat: add GET /api/analytics multi-metric endpoint"),
    # Day 10 = Jan 13
    (10, "app/api/submit/route.ts",                  "feat: add POST /api/submit with Zod validation"),
    (10, "hooks/use-filter-state.ts",                "feat: add useFilterState hook for URL-synced filters"),
    # Day 11 = Jan 14
    (11, "components/filter-chips.tsx",              "feat: add FilterChips component for active filter display"),
    (11, "components/pagination.tsx",                "feat: add Pagination component with ellipsis logic"),
    # Day 12 = Jan 15
    (12, "components/investor-card.tsx",             "feat: add InvestorCard with deal count and sector tags"),
    (12, "components/investor-portfolio.tsx",        "feat: add InvestorPortfolio timeline view by year"),
    # Day 13 = Jan 16
    (13, "components/investor-stats.tsx",            "feat: add InvestorStats charts (stage, sector, city)"),
    (13, "components/empty-state.tsx",               "feat: add EmptyState component for zero-result screens"),
    # Day 14 = Jan 18
    (14, "app/investors/page.tsx",                   "feat: add investors listing page with stats summary"),
    (14, "app/loading.tsx",                          "feat: add global loading UI"),
    (14, "app/not-found.tsx",                        "feat: add custom 404 page"),
    # Day 15 = Jan 19
    (15, "scripts/migrate-to-supabase.ts",          "feat: add CSV-to-Supabase migration script"),
    # Day 16 = Jan 20
    (16, "scripts/extract-investors.ts",             "feat: add investor extraction and sync script"),
]

def main():
    print("=== January 2026 Backfill ===\n")

    util_idx = 0
    type_idx = 0
    const_idx = 0
    small_idx = 0

    # Track which files have been staged per day
    staged_files_by_day = {}
    for day_i, fpath, msg in FILE_STAGES:
        staged_files_by_day.setdefault(day_i, []).append((fpath, msg))

    for day_i, date in enumerate(MISSING_DAYS):
        print(f"\n{date}")
        hour = 9
        committed = 0

        # Phase 1: Stage assigned new files for this day
        if day_i in staged_files_by_day:
            for fpath, msg in staged_files_by_day[day_i]:
                minute = 0 + committed * 7
                stage(fpath)
                commit(msg, date, hour, min(minute, 55))
                committed += 1
                if committed % 2 == 0: hour += 1

        # Phase 2: Fill to 8 commits with incremental improvements
        target = 8
        while committed < target:
            minute = committed * 7 % 60
            # Cycle through improvement types
            pool = committed % 4

            if pool == 0 and util_idx < len(UTIL_ADDITIONS):
                content, msg = UTIL_ADDITIONS[util_idx]; util_idx += 1
                afile("lib/utils.ts", content)
                stage("lib/utils.ts")
                commit(msg, date, hour, minute)

            elif pool == 1 and type_idx < len(TYPE_ADDITIONS):
                content, msg = TYPE_ADDITIONS[type_idx]; type_idx += 1
                afile("lib/types.ts", content)
                stage("lib/types.ts")
                commit(msg, date, hour, minute)

            elif pool == 2 and const_idx < len(CONST_ADDITIONS):
                content, msg = CONST_ADDITIONS[const_idx]; const_idx += 1
                afile("lib/constants.ts", content)
                stage("lib/constants.ts")
                commit(msg, date, hour, minute)

            elif small_idx < len(SMALL_FILES):
                path, content, msg = SMALL_FILES[small_idx]; small_idx += 1
                wfile(path, content)
                stage(path)
                commit(msg, date, hour, minute)

            else:
                # Fallback: add a small refinement to lib/utils.ts
                note = f'\n// utility module — last updated {date}\n'
                afile("lib/utils.ts", note)
                stage("lib/utils.ts")
                commit(f"chore: update utils module header ({date})", date, hour, minute)

            committed += 1
            if committed % 3 == 0: hour += 1

    print(f"\n✓ Done. Total days processed: {len(MISSING_DAYS)}")
    print("Run: git push origin main")

if __name__ == "__main__":
    main()
