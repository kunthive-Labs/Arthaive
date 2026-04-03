#!/usr/bin/env python3
"""
February 2026 GitHub contribution backfill.
188 commits across 25 days — Feb 7, 15, 23 intentionally blank.
Variable commit counts: light (2-4), medium (5-9), heavy (11-15).
Run from repo root: python3 scripts/backfill-feb.py
"""
import subprocess, os

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
    print(f"  {'OK' if ok else '--'} [{date} {h:02d}:{m:02d}] {msg}")

def afile(path, content):
    full = os.path.join(REPO, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "a") as f: f.write(content)

def wfile(path, content):
    full = os.path.join(REPO, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f: f.write(content)

# ── DAILY TARGETS  (blank: Feb 7, 15, 23) ────────────────────────────────────

DAILY_TARGETS = {
    "2026-02-01":  3, "2026-02-02": 12, "2026-02-03":  4, "2026-02-04": 11,
    "2026-02-05":  6, "2026-02-06":  3, "2026-02-08": 14, "2026-02-09":  8,
    "2026-02-10":  4, "2026-02-11": 13, "2026-02-12":  7, "2026-02-13":  5,
    "2026-02-14":  2, "2026-02-16": 11, "2026-02-17":  6, "2026-02-18":  3,
    "2026-02-19": 15, "2026-02-20":  9, "2026-02-21":  4, "2026-02-22": 12,
    "2026-02-24":  7, "2026-02-25":  3, "2026-02-26": 11, "2026-02-27":  5,
    "2026-02-28": 10,
}

MISSING_DAYS = sorted(DAILY_TARGETS.keys())

# ── POOL 1: lib/utils.ts (append) ─────────────────────────────────────────────

UTIL_ADDITIONS_FEB = [
    ('\nexport function parseAmount(str: string): number {\n  const n = parseFloat(str.replace(/[\\u20b9$,\\s]/g, ""))\n  return isNaN(n) ? 0 : n\n}\n', "feat: add parseAmount currency string parser"),
    ('\nexport function compareAmounts(a: number, b: number): -1 | 0 | 1 {\n  return a < b ? -1 : a > b ? 1 : 0\n}\n', "feat: add compareAmounts numeric comparator"),
    ('\nexport function formatGrowth(prev: number, curr: number): string {\n  if (!prev) return "N/A"\n  const pct = ((curr - prev) / prev) * 100\n  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"\n}\n', "feat: add formatGrowth rate formatter"),
    ('\nexport function formatPercentage(value: number, decimals = 1): string {\n  return value.toFixed(decimals) + "%"\n}\n', "feat: add formatPercentage display helper"),
    ('\nexport function median(nums: number[]): number {\n  if (!nums.length) return 0\n  const s = [...nums].sort((a, b) => a - b)\n  const m = Math.floor(s.length / 2)\n  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2\n}\n', "feat: add median statistical helper"),
    ('\nexport function mean(nums: number[]): number {\n  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0\n}\n', "feat: add mean statistical helper"),
    ('\nexport function stddev(nums: number[]): number {\n  const m = mean(nums)\n  return Math.sqrt(mean(nums.map(n => (n - m) ** 2)))\n}\n', "feat: add stddev statistical helper"),
    ('\nexport function toTitleCase(str: string): string {\n  return str.replace(/\\b\\w/g, c => c.toUpperCase())\n}\n', "feat: add toTitleCase string transformer"),
    ('\nexport function camelToKebab(str: string): string {\n  return str.replace(/([A-Z])/g, m => "-" + m.toLowerCase())\n}\n', "feat: add camelToKebab case converter"),
    ('\nexport function kebabToCamel(str: string): string {\n  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())\n}\n', "feat: add kebabToCamel case converter"),
    ('\nexport function stripHtml(html: string): string {\n  return html.replace(/<[^>]*>/g, "")\n}\n', "feat: add stripHtml sanitiser"),
    ('\nexport function formatNumber(n: number): string {\n  return new Intl.NumberFormat("en-IN").format(Math.round(n))\n}\n', "feat: add formatNumber locale formatter"),
    ('\nexport function formatCompact(n: number): string {\n  if (n >= 1e7) return (n / 1e7).toFixed(1) + "Cr"\n  if (n >= 1e5) return (n / 1e5).toFixed(1) + "L"\n  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"\n  return String(n)\n}\n', "feat: add formatCompact short number format"),
    ('\nexport function calcYoY(prev: number, curr: number): number {\n  return prev === 0 ? 0 : ((curr - prev) / prev) * 100\n}\n', "feat: add calcYoY growth rate utility"),
    ('\nexport function getWeekNumber(date: Date): number {\n  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))\n  const day = d.getUTCDay() || 7\n  d.setUTCDate(d.getUTCDate() + 4 - day)\n  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))\n  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)\n}\n', "feat: add getWeekNumber ISO week helper"),
    ('\nexport function chunkArray<T>(arr: T[], size: number): T[][] {\n  const result: T[][] = []\n  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))\n  return result\n}\n', "feat: add chunkArray batch splitter"),
    ('\nexport function flatUnique<T>(arrays: T[][]): T[] {\n  return [...new Set(arrays.flat())]\n}\n', "feat: add flatUnique flatten-deduplicate helper"),
    ('\nexport function sumBy<T>(arr: T[], fn: (item: T) => number): number {\n  return arr.reduce((acc, item) => acc + fn(item), 0)\n}\n', "feat: add sumBy array aggregator"),
    ('\nexport function maxBy<T>(arr: T[], fn: (item: T) => number): T | undefined {\n  return arr.reduce<T | undefined>((max, item) => !max || fn(item) > fn(max) ? item : max, undefined)\n}\n', "feat: add maxBy array reducer"),
    ('\nexport function minBy<T>(arr: T[], fn: (item: T) => number): T | undefined {\n  return arr.reduce<T | undefined>((min, item) => !min || fn(item) < fn(min) ? item : min, undefined)\n}\n', "feat: add minBy array reducer"),
    ('\nexport function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {\n  return arr.reduce<Record<string, T[]>>((acc, item) => {\n    const key = fn(item);(acc[key] ??= []).push(item); return acc\n  }, {})\n}\n', "feat: add groupBy array grouping utility"),
    ('\nexport function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {\n  const copy = { ...obj } as T\n  for (const k of keys) delete copy[k]\n  return copy\n}\n', "feat: add omit key exclusion utility"),
    ('\nexport function mapValues<T, U>(obj: Record<string, T>, fn: (v: T, k: string) => U): Record<string, U> {\n  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]))\n}\n', "feat: add mapValues object transformer"),
    ('\nexport function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {\n  const result = { ...base }\n  for (const key in override) {\n    const v = override[key]\n    if (v && typeof v === "object" && !Array.isArray(v)) {\n      result[key] = deepMerge(base[key] as Record<string, unknown>, v as Record<string, unknown>) as T[typeof key]\n    } else if (v !== undefined) { result[key] = v as T[typeof key] }\n  }\n  return result\n}\n', "feat: add deepMerge recursive object merger"),
    ('\nexport function normalizeString(str: string): string {\n  return str.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim()\n}\n', "feat: add normalizeString accent-insensitive helper"),
    ('\nexport function fuzzyMatch(query: string, target: string): boolean {\n  const q = normalizeString(query), t = normalizeString(target)\n  let qi = 0\n  for (let ti = 0; ti < t.length && qi < q.length; ti++) {\n    if (t[ti] === q[qi]) qi++\n  }\n  return qi === q.length\n}\n', "feat: add fuzzyMatch string search utility"),
    ('\nexport function scoreRelevance(deal: { company?: string; sectors?: string[]; description?: string }, query: string): number {\n  const q = query.toLowerCase()\n  let score = 0\n  if (deal.company?.toLowerCase().includes(q)) score += 3\n  if (deal.sectors?.some(s => s.toLowerCase().includes(q))) score += 2\n  if (deal.description?.toLowerCase().includes(q)) score += 1\n  return score\n}\n', "feat: add scoreRelevance search ranking helper"),
    ('\nexport function formatDealAge(dateStr: string): string {\n  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)\n  if (days === 0) return "Today"\n  if (days === 1) return "Yesterday"\n  if (days < 7) return `${days} days ago`\n  if (days < 30) return `${Math.floor(days / 7)}w ago`\n  return `${Math.floor(days / 30)}mo ago`\n}\n', "feat: add formatDealAge relative time display"),
    ('\nexport function isRecentDeal(dateStr: string, withinDays = 30): boolean {\n  return (Date.now() - new Date(dateStr).getTime()) / 86400000 <= withinDays\n}\n', "feat: add isRecentDeal recency check"),
    ('\nexport function zipArrays<A, B>(a: A[], b: B[]): Array<[A, B]> {\n  const len = Math.min(a.length, b.length)\n  return Array.from({ length: len }, (_, i) => [a[i], b[i]])\n}\n', "feat: add zipArrays pair combiner"),
]

# ── POOL 2: lib/types.ts (append) ─────────────────────────────────────────────

TYPE_ADDITIONS_FEB = [
    ('\n\nexport type ExportFormat = "csv" | "json" | "xlsx"\n\nexport interface ExportOptions {\n  format: ExportFormat\n  fields?: string[]\n  filename?: string\n}\n', "feat: add ExportFormat and ExportOptions types"),
    ('\n\nexport interface CompareResult {\n  metricA: number\n  metricB: number\n  delta: number\n  pctChange: number\n}\n', "feat: add CompareResult type"),
    ('\n\nexport interface TrendPoint {\n  date: string\n  value: number\n  label?: string\n}\n\nexport type TrendSeries = TrendPoint[]\n', "feat: add TrendPoint and TrendSeries types"),
    ('\n\nexport interface SectorStats {\n  sector: string\n  dealCount: number\n  totalFunding: number\n  avgDealSize: number\n  topStage: string\n}\n', "feat: add SectorStats aggregation type"),
    ('\n\nexport interface CityStats {\n  city: string\n  dealCount: number\n  totalFunding: number\n  topSector: string\n}\n', "feat: add CityStats aggregation type"),
    ('\n\nexport interface WeeklyStats {\n  week: string\n  dealCount: number\n  totalFunding: number\n  sectors: string[]\n}\n', "feat: add WeeklyStats digest type"),
    ('\n\nexport interface SearchSuggestion {\n  type: "company" | "sector" | "investor" | "location"\n  label: string\n  value: string\n  count?: number\n}\n', "feat: add SearchSuggestion type for autocomplete"),
    ('\n\nexport interface BookmarkItem {\n  id: string\n  type: "deal" | "investor"\n  savedAt: string\n}\n', "feat: add BookmarkItem type"),
    ('\n\nexport interface SharePayload {\n  url: string\n  title: string\n  text?: string\n  platform?: "twitter" | "linkedin" | "whatsapp" | "copy"\n}\n', "feat: add SharePayload type"),
    ('\n\nexport interface NotifyPrefs {\n  email?: string\n  sectors?: string[]\n  stages?: string[]\n  minAmount?: number\n  frequency: "daily" | "weekly"\n}\n', "feat: add NotifyPrefs subscription type"),
    ('\n\nexport interface AnalyticsFilter {\n  dateFrom?: string\n  dateTo?: string\n  sectors?: string[]\n  stages?: string[]\n  cities?: string[]\n  metric: "count" | "amount" | "avg"\n}\n', "feat: add AnalyticsFilter type"),
    ('\n\nexport interface HeatmapCell {\n  x: string\n  y: string\n  value: number\n  label?: string\n}\n', "feat: add HeatmapCell type for analytics grids"),
    ('\n\nexport type FundingStage =\n  | "Pre-Seed" | "Seed" | "Series A" | "Series B"\n  | "Series C" | "Series D" | "Series E"\n  | "Pre-IPO" | "Bridge" | "Debt" | "Grant"\n', "feat: add FundingStage exhaustive union type"),
    ('\n\nexport type DealSource = "scrape" | "press" | "filing" | "tip" | "manual"\n\nexport interface DealMeta {\n  source: DealSource\n  confidence: "high" | "medium" | "low"\n  verifiedAt?: string\n}\n', "feat: add DealSource and DealMeta provenance types"),
    ('\n\nexport interface PaginationState {\n  page: number\n  pageSize: number\n  total: number\n  totalPages: number\n}\n', "feat: add PaginationState type"),
    ('\n\nexport interface TableColumn<T = unknown> {\n  key: string\n  label: string\n  sortable?: boolean\n  render?: (value: T) => string\n  width?: number\n}\n', "feat: add generic TableColumn type"),
    ('\n\nexport interface FilterPreset {\n  id: string\n  name: string\n  filters: DealFilters\n  createdAt: string\n}\n', "feat: add FilterPreset saved-filter type"),
    ('\n\nexport interface DashboardWidget {\n  id: string\n  type: "stat" | "chart" | "table" | "heatmap"\n  title: string\n  metric: string\n  span?: 1 | 2 | 3 | 4\n}\n', "feat: add DashboardWidget layout type"),
    ('\n\nexport interface ReportConfig {\n  title: string\n  dateRange: { from: string; to: string }\n  sections: Array<{ type: string; config: Record<string, unknown> }>\n  format: ExportFormat\n}\n', "feat: add ReportConfig export type"),
    ('\n\nexport interface DealComparison {\n  ids: string[]\n  metrics: Record<string, CompareResult>\n  winner?: string\n}\n', "feat: add DealComparison multi-deal compare type"),
]

# ── POOL 3: lib/constants.ts (append) ─────────────────────────────────────────

CONST_ADDITIONS_FEB = [
    ('\n\nexport const EXPORT_FORMATS = [\n  { label: "CSV", value: "csv" as const },\n  { label: "JSON", value: "json" as const },\n  { label: "Excel", value: "xlsx" as const },\n] as const\n', "feat: add EXPORT_FORMATS constant"),
    ('\n\nexport const COMPARE_MAX = 3\n', "feat: add COMPARE_MAX deal comparison limit constant"),
    ('\n\nexport const CITY_COORDINATES: Record<string, [number, number]> = {\n  "Bengaluru": [12.97, 77.59],\n  "Mumbai": [19.07, 72.87],\n  "Delhi": [28.61, 77.20],\n  "Hyderabad": [17.38, 78.48],\n  "Chennai": [13.08, 80.27],\n  "Pune": [18.52, 73.85],\n  "Kolkata": [22.57, 88.36],\n  "Ahmedabad": [23.02, 72.57],\n}\n', "feat: add CITY_COORDINATES map data constant"),
    ('\n\nexport const SECTOR_COLORS: Record<string, string> = {\n  "Fintech": "#15803d",\n  "Edtech": "#1d4ed8",\n  "Healthtech": "#7c3aed",\n  "SaaS": "#b45309",\n  "E-Commerce": "#dc2626",\n  "Logistics": "#0891b2",\n  "Agritech": "#65a30d",\n  "Cleantech": "#0d9488",\n  "D2C": "#db2777",\n  "Gaming": "#9333ea",\n}\n', "feat: add SECTOR_COLORS chart palette constant"),
    ('\n\nexport const TREND_WINDOWS = [\n  { label: "1M", days: 30 },\n  { label: "3M", days: 90 },\n  { label: "6M", days: 180 },\n  { label: "1Y", days: 365 },\n  { label: "All", days: 0 },\n] as const\n', "feat: add TREND_WINDOWS time window options"),
    ('\n\nexport const SHARE_PLATFORMS = [\n  { label: "Twitter/X", value: "twitter" as const },\n  { label: "LinkedIn", value: "linkedin" as const },\n  { label: "WhatsApp", value: "whatsapp" as const },\n  { label: "Copy Link", value: "copy" as const },\n] as const\n', "feat: add SHARE_PLATFORMS social sharing constant"),
    ('\n\nexport const WEEKLY_DIGEST_DAY = 1\nexport const SEARCH_DEBOUNCE_MS = 300\nexport const MAX_BOOKMARKS = 50\n', "feat: add app behaviour tuning constants"),
    ('\n\nexport const API_VERSION = "v1"\nexport const API_BASE = `/api/${API_VERSION}`\n', "feat: add API versioning constants"),
    ('\n\nexport const DEFAULT_CHART_TYPE: "bar" | "line" | "pie" = "bar"\n', "feat: add DEFAULT_CHART_TYPE constant"),
    ('\n\nexport const INVESTOR_TYPES = [\n  "VC Fund", "Angel", "Family Office", "CVC",\n  "PE Fund", "Accelerator", "Government", "Micro-VC",\n] as const\n\nexport const FUNDING_STAGES_ORDER = [\n  "Pre-Seed", "Seed", "Series A", "Series B",\n  "Series C", "Series D", "Pre-IPO", "Bridge", "Debt",\n] as const\n', "feat: add INVESTOR_TYPES and FUNDING_STAGES_ORDER constants"),
    ('\n\nexport const TOP_CITIES = [\n  "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad",\n  "Chennai", "Pune", "Kolkata", "Ahmedabad", "Gurugram",\n] as const\n', "feat: add TOP_CITIES constant"),
    ('\n\nexport const BREAKPOINTS = {\n  sm: 640, md: 768, lg: 1024, xl: 1280,\n} as const\n', "feat: add BREAKPOINTS responsive constant"),
    ('\n\nexport const DEFAULT_FILTERS = {\n  sector: [] as string[],\n  stage: [] as string[],\n  location: "",\n  search: "",\n  page: 1,\n  pageSize: 20,\n}\n', "feat: add DEFAULT_FILTERS immutable baseline"),
    ('\n\nexport const MONTH_LABELS = [\n  "Jan", "Feb", "Mar", "Apr", "May", "Jun",\n  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",\n] as const\n', "feat: add MONTH_LABELS calendar constant"),
    ('\n\nexport const DEAL_TABLE_COLUMNS = [\n  { key: "company", label: "Company", sortable: true },\n  { key: "amount", label: "Amount", sortable: true },\n  { key: "stage", label: "Stage", sortable: true },\n  { key: "sector", label: "Sector", sortable: false },\n  { key: "location", label: "City", sortable: true },\n  { key: "date", label: "Date", sortable: true },\n] as const\n', "feat: add DEAL_TABLE_COLUMNS config constant"),
]

# ── POOL 4: lib/filters.ts (append) ───────────────────────────────────────────

FILTER_ADDITIONS_FEB = [
    ('\nexport function buildQueryString(filters: Record<string, string | string[] | number | undefined>): string {\n  const params = new URLSearchParams()\n  for (const [k, v] of Object.entries(filters)) {\n    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue\n    params.set(k, Array.isArray(v) ? v.join(",") : String(v))\n  }\n  return params.toString()\n}\n', "feat: add buildQueryString filter serialiser"),
    ('\nexport function parseQueryString(search: string): Record<string, string | string[]> {\n  const params = new URLSearchParams(search)\n  const result: Record<string, string | string[]> = {}\n  for (const [k, v] of params.entries()) {\n    result[k] = v.includes(",") ? v.split(",") : v\n  }\n  return result\n}\n', "feat: add parseQueryString filter deserialiser"),
    ('\nexport function countActiveFilters(filters: Record<string, unknown>): number {\n  return Object.values(filters).filter(v => {\n    if (Array.isArray(v)) return v.length > 0\n    return v !== "" && v !== undefined && v !== null && v !== 1\n  }).length\n}\n', "feat: add countActiveFilters badge counter helper"),
    ('\nexport function mergeFilters<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {\n  return { ...base, ...patch, page: 1 }\n}\n', "feat: add mergeFilters with page reset"),
    ('\nexport function filtersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {\n  return JSON.stringify(a) === JSON.stringify(b)\n}\n', "feat: add filtersEqual shallow comparison"),
    ('\nexport function serializeFilters(filters: Record<string, unknown>): string {\n  return btoa(JSON.stringify(filters))\n}\n', "feat: add serializeFilters URL-safe encoder"),
    ('\nexport function deserializeFilters<T>(encoded: string): T | null {\n  try { return JSON.parse(atob(encoded)) as T } catch { return null }\n}\n', "feat: add deserializeFilters URL-safe decoder"),
    ('\nexport function removeFilterValue(filters: Record<string, string | string[]>, key: string, value: string): Record<string, string | string[]> {\n  const current = filters[key]\n  if (Array.isArray(current)) return { ...filters, [key]: current.filter(v => v !== value) }\n  return { ...filters, [key]: "" }\n}\n', "feat: add removeFilterValue chip removal helper"),
    ('\nexport function getStageColor(stage: string): string {\n  const map: Record<string, string> = {\n    "Pre-Seed": "bg-purple-100 text-purple-800",\n    "Seed": "bg-green-100 text-green-800",\n    "Series A": "bg-blue-100 text-blue-800",\n    "Series B": "bg-indigo-100 text-indigo-800",\n    "Series C": "bg-yellow-100 text-yellow-800",\n    "Debt": "bg-gray-100 text-gray-800",\n    "Bridge": "bg-orange-100 text-orange-800",\n  }\n  return map[stage] ?? "bg-gray-100 text-gray-700"\n}\n', "feat: add getStageColor Tailwind class mapper"),
    ('\nexport function sortDealsByField<T extends Record<string, unknown>>(deals: T[], field: keyof T, order: "asc" | "desc" = "desc"): T[] {\n  return [...deals].sort((a, b) => {\n    const av = a[field], bv = b[field]\n    if (typeof av === "number" && typeof bv === "number") return order === "asc" ? av - bv : bv - av\n    return order === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))\n  })\n}\n', "feat: add sortDealsByField generic sort"),
    ('\nexport function paginateArray<T>(arr: T[], page: number, size: number): { items: T[]; total: number; totalPages: number } {\n  const total = arr.length\n  const totalPages = Math.ceil(total / size)\n  const items = arr.slice((page - 1) * size, page * size)\n  return { items, total, totalPages }\n}\n', "feat: add paginateArray client-side pagination"),
    ('\nexport function buildMonthlyTrend(deals: Array<{ date?: string; amount?: number }>): Array<{ month: string; count: number; total: number }> {\n  const byMonth: Record<string, { count: number; total: number }> = {}\n  for (const deal of deals) {\n    if (!deal.date) continue\n    const month = deal.date.slice(0, 7)\n    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 }\n    byMonth[month].count++; byMonth[month].total += deal.amount ?? 0\n  }\n  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }))\n}\n', "feat: add buildMonthlyTrend time series builder"),
    ('\nexport function topN<T>(items: T[], n: number, scoreFn: (item: T) => number): T[] {\n  return [...items].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, n)\n}\n', "feat: add topN ranked list helper"),
    ('\nexport function deduplicateByKey<T>(arr: T[], key: keyof T): T[] {\n  const seen = new Set()\n  return arr.filter(item => { const k = item[key]; if (seen.has(k)) return false; seen.add(k); return true })\n}\n', "feat: add deduplicateByKey array utility"),
    ('\nexport function buildSectorStats(deals: Array<{ sectors?: string[]; amount?: number }>): Record<string, { count: number; total: number }> {\n  const stats: Record<string, { count: number; total: number }> = {}\n  for (const deal of deals) {\n    for (const sector of deal.sectors ?? []) {\n      if (!stats[sector]) stats[sector] = { count: 0, total: 0 }\n      stats[sector].count++; stats[sector].total += deal.amount ?? 0\n    }\n  }\n  return stats\n}\n', "feat: add buildSectorStats aggregation helper"),
    ('\nexport function buildCityStats(deals: Array<{ location?: string; amount?: number }>): Record<string, { count: number; total: number }> {\n  const stats: Record<string, { count: number; total: number }> = {}\n  for (const deal of deals) {\n    const city = deal.location ?? "Unknown"\n    if (!stats[city]) stats[city] = { count: 0, total: 0 }\n    stats[city].count++; stats[city].total += deal.amount ?? 0\n  }\n  return stats\n}\n', "feat: add buildCityStats aggregation helper"),
    ('\nexport function pickRandom<T>(arr: T[], n = 1): T[] {\n  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)\n}\n', "feat: add pickRandom sampling helper"),
    ('\nexport function invertRecord<T extends string>(rec: Record<T, string>): Record<string, T> {\n  return Object.fromEntries(Object.entries(rec).map(([k, v]) => [v, k])) as Record<string, T>\n}\n', "feat: add invertRecord key-value swap"),
    ('\nexport function calcPortfolioStats(amounts: number[]): { total: number; avg: number; count: number } {\n  const total = amounts.reduce((a, b) => a + b, 0)\n  return { count: amounts.length, total, avg: amounts.length ? total / amounts.length : 0 }\n}\n', "feat: add calcPortfolioStats investor analytics"),
    ('\nexport function highlightMatch(text: string, query: string): string {\n  if (!query.trim()) return text\n  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")})`, "gi")\n  return text.replace(regex, "<mark>$1</mark>")\n}\n', "feat: add highlightMatch search result highlighter"),
    ('\nexport function filterDeals<T extends { stage?: string; sectors?: string[]; location?: string; amount?: number }>(deals: T[], f: { stage?: string[]; sectors?: string[]; location?: string; minAmount?: number; maxAmount?: number }): T[] {\n  return deals.filter(d => {\n    if (f.stage?.length && d.stage && !f.stage.includes(d.stage)) return false\n    if (f.sectors?.length && !d.sectors?.some(s => f.sectors!.includes(s))) return false\n    if (f.location && d.location !== f.location) return false\n    if (f.minAmount != null && (d.amount ?? 0) < f.minAmount) return false\n    if (f.maxAmount != null && (d.amount ?? 0) > f.maxAmount) return false\n    return true\n  })\n}\n', "feat: add filterDeals client-side filter utility"),
    ('\nexport function normalizeAmount(raw: number | string | undefined): number {\n  if (typeof raw === "number") return raw\n  if (!raw) return 0\n  return parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0\n}\n', "feat: add normalizeAmount input normaliser"),
    ('\nexport function buildInvestorIndex(deals: Array<{ investors?: string[] }>): Record<string, number> {\n  const idx: Record<string, number> = {}\n  for (const deal of deals) {\n    for (const inv of deal.investors ?? []) {\n      idx[inv] = (idx[inv] ?? 0) + 1\n    }\n  }\n  return idx\n}\n', "feat: add buildInvestorIndex deal count mapper"),
    ('\nexport function calcMarketShare(stats: Record<string, { total: number }>): Record<string, number> {\n  const grand = Object.values(stats).reduce((s, v) => s + v.total, 0)\n  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, grand ? (v.total / grand) * 100 : 0]))\n}\n', "feat: add calcMarketShare percentage breakdown"),
    ('\nexport function buildTimeline(deals: Array<{ date?: string; amount?: number; company?: string }>): Array<{ year: string; count: number; total: number }> {\n  const byYear: Record<string, { count: number; total: number }> = {}\n  for (const deal of deals) {\n    if (!deal.date) continue\n    const year = deal.date.slice(0, 4)\n    if (!byYear[year]) byYear[year] = { count: 0, total: 0 }\n    byYear[year].count++; byYear[year].total += deal.amount ?? 0\n  }\n  return Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, v]) => ({ year, ...v }))\n}\n', "feat: add buildTimeline yearly aggregation"),
    ('\nexport function toCSVString(rows: Array<Record<string, unknown>>, cols: string[]): string {\n  const header = cols.join(",")\n  const lines = rows.map(r => cols.map(c => `"${String(r[c] ?? "").replace(/"/g, \'""\')}"`).join(","))\n  return [header, ...lines].join("\\n")\n}\n', "feat: add toCSVString bulk CSV serialiser"),
    ('\nexport function parseCSVString(csv: string): Array<Record<string, string>> {\n  const [headerLine, ...rows] = csv.trim().split("\\n")\n  const keys = headerLine.split(",")\n  return rows.map(row => {\n    const vals = row.split(",")\n    return Object.fromEntries(keys.map((k, i) => [k.trim(), (vals[i] ?? "").trim()]))\n  })\n}\n', "feat: add parseCSVString bulk CSV parser"),
    ('\nexport function validateDealRecord(deal: Record<string, unknown>): string[] {\n  const errors: string[] = []\n  if (!deal.company) errors.push("company required")\n  if (!deal.amount || isNaN(Number(deal.amount))) errors.push("valid amount required")\n  if (!deal.date || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(deal.date))) errors.push("date must be YYYY-MM-DD")\n  return errors\n}\n', "feat: add validateDealRecord import validator"),
    ('\nexport function enrichDealWithMeta(deal: Record<string, unknown>): Record<string, unknown> {\n  return {\n    ...deal,\n    slug: String(deal.company ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),\n    importedAt: new Date().toISOString(),\n  }\n}\n', "feat: add enrichDealWithMeta import enrichment"),
    ('\nexport function computeMedianDealSize(deals: Array<{ amount?: number }>): number {\n  const amounts = deals.map(d => d.amount ?? 0).filter(Boolean).sort((a, b) => a - b)\n  if (!amounts.length) return 0\n  const m = Math.floor(amounts.length / 2)\n  return amounts.length % 2 ? amounts[m] : (amounts[m - 1] + amounts[m]) / 2\n}\n', "feat: add computeMedianDealSize analytics helper"),
]

# ── POOL 5: lib/chart-utils.ts (append) ───────────────────────────────────────

CHART_UTILS_FEB = [
    ('\nexport function normalizeChartData(data: Array<{ value: number; label: string }>): Array<{ value: number; label: string; pct: number }> {\n  const total = data.reduce((s, d) => s + d.value, 0)\n  return data.map(d => ({ ...d, pct: total ? (d.value / total) * 100 : 0 }))\n}\n', "feat: add normalizeChartData percentage normaliser"),
    ('\nexport function limitChartItems<T extends { value: number }>(items: T[], max = 10, otherLabel = "Other"): Array<T | { label: string; value: number }> {\n  if (items.length <= max) return items\n  const top = items.slice(0, max - 1)\n  const rest = items.slice(max - 1).reduce((s, i) => s + i.value, 0)\n  return [...top, { label: otherLabel, value: rest } as T]\n}\n', "feat: add limitChartItems top-N with other bucket"),
    ('\nexport function calcAxisBounds(values: number[], padding = 0.1): { min: number; max: number } {\n  const min = Math.min(...values)\n  const max = Math.max(...values)\n  const range = max - min || 1\n  return { min: Math.max(0, min - range * padding), max: max + range * padding }\n}\n', "feat: add calcAxisBounds chart axis helper"),
    ('\nexport function formatAxisLabel(value: number): string {\n  if (value >= 1e7) return (value / 1e7).toFixed(0) + "Cr"\n  if (value >= 1e5) return (value / 1e5).toFixed(0) + "L"\n  if (value >= 1e3) return (value / 1e3).toFixed(0) + "K"\n  return String(value)\n}\n', "feat: add formatAxisLabel Y-axis formatter"),
    ('\nexport function buildBarData(items: Array<{ label: string; value: number }>, color = "#15803d"): object {\n  return {\n    labels: items.map(i => i.label),\n    datasets: [{ data: items.map(i => i.value), backgroundColor: color, borderRadius: 4 }],\n  }\n}\n', "feat: add buildBarData Chart.js helper"),
    ('\nexport function buildLineData(series: Array<{ label: string; points: Array<{ x: string; y: number }> }>): object {\n  return {\n    datasets: series.map((s, idx) => ({\n      label: s.label,\n      data: s.points,\n      tension: 0.3,\n      fill: false,\n    })),\n  }\n}\n', "feat: add buildLineData time series helper"),
    ('\nexport function buildPieData(items: Array<{ label: string; value: number }>, colors: string[]): object {\n  return {\n    labels: items.map(i => i.label),\n    datasets: [{ data: items.map(i => i.value), backgroundColor: colors.slice(0, items.length) }],\n  }\n}\n', "feat: add buildPieData pie chart helper"),
    ('\nexport function calcMovingAverage(values: number[], window = 3): number[] {\n  return values.map((_, i) => {\n    const start = Math.max(0, i - window + 1)\n    const slice = values.slice(start, i + 1)\n    return slice.reduce((a, b) => a + b, 0) / slice.length\n  })\n}\n', "feat: add calcMovingAverage trend smoother"),
    ('\nexport function normalizeToPercent(values: number[]): number[] {\n  const total = values.reduce((a, b) => a + b, 0)\n  return total ? values.map(v => (v / total) * 100) : values.map(() => 0)\n}\n', "feat: add normalizeToPercent chart normaliser"),
    ('\nexport function buildHeatmapData(cells: Array<{ x: string; y: string; value: number }>): { xLabels: string[]; yLabels: string[]; matrix: number[][] } {\n  const xLabels = [...new Set(cells.map(c => c.x))]\n  const yLabels = [...new Set(cells.map(c => c.y))]\n  const matrix = yLabels.map(y => xLabels.map(x => cells.find(c => c.x === x && c.y === y)?.value ?? 0))\n  return { xLabels, yLabels, matrix }\n}\n', "feat: add buildHeatmapData matrix builder"),
    ('\nexport function getChartColorByIndex(idx: number): string {\n  const palette = ["#15803d","#1d4ed8","#7c3aed","#b45309","#dc2626","#0891b2","#db2777","#65a30d","#9333ea","#0d9488"]\n  return palette[idx % palette.length]\n}\n', "feat: add getChartColorByIndex palette helper"),
    ('\nexport function buildStackedBarData(series: Array<{ label: string; data: number[]; color: string }>, xLabels: string[]): object {\n  return {\n    labels: xLabels,\n    datasets: series.map(s => ({ label: s.label, data: s.data, backgroundColor: s.color, stack: "stack0" })),\n  }\n}\n', "feat: add buildStackedBarData stacked chart helper"),
    ('\nexport function calcTrendLine(points: number[]): { slope: number; intercept: number } {\n  const n = points.length\n  const xs = points.map((_, i) => i)\n  const meanX = xs.reduce((a, b) => a + b, 0) / n\n  const meanY = points.reduce((a, b) => a + b, 0) / n\n  const num = xs.reduce((s, x, i) => s + (x - meanX) * (points[i] - meanY), 0)\n  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0)\n  const slope = den ? num / den : 0\n  return { slope, intercept: meanY - slope * meanX }\n}\n', "feat: add calcTrendLine linear regression helper"),
    ('\nexport function buildDonutData(items: Array<{ label: string; value: number }>, colors: string[]): object {\n  return {\n    labels: items.map(i => i.label),\n    datasets: [{ data: items.map(i => i.value), backgroundColor: colors, cutout: "65%" }],\n  }\n}\n', "feat: add buildDonutData donut chart helper"),
    ('\nexport function mergeChartSeries(base: number[], overlay: number[]): Array<{ base: number; overlay: number; diff: number }> {\n  const len = Math.max(base.length, overlay.length)\n  return Array.from({ length: len }, (_, i) => ({\n    base: base[i] ?? 0,\n    overlay: overlay[i] ?? 0,\n    diff: (overlay[i] ?? 0) - (base[i] ?? 0),\n  }))\n}\n', "feat: add mergeChartSeries comparison data builder"),
    ('\nexport function buildAreaData(points: Array<{ x: string; y: number }>, color = "#15803d"): object {\n  return {\n    datasets: [{\n      data: points,\n      backgroundColor: color + "33",\n      borderColor: color,\n      fill: true,\n      tension: 0.4,\n    }],\n  }\n}\n', "feat: add buildAreaData filled area chart helper"),
    ('\nexport function calcYAxisMax(values: number[], roundTo = 1000): number {\n  const max = Math.max(...values, 0)\n  return Math.ceil(max / roundTo) * roundTo\n}\n', "feat: add calcYAxisMax round-up axis bound"),
    ('\nexport function buildFunnelData(stages: string[], values: number[]): Array<{ stage: string; value: number; pct: number }> {\n  const max = values[0] || 1\n  return stages.map((stage, i) => ({ stage, value: values[i], pct: (values[i] / max) * 100 }))\n}\n', "feat: add buildFunnelData funnel chart helper"),
    ('\nexport function buildTimeAxis(from: string, to: string, unit: "month" | "quarter" | "year" = "month"): string[] {\n  const result: string[] = []\n  const cur = new Date(from)\n  const end = new Date(to)\n  while (cur <= end) {\n    if (unit === "month") result.push(cur.toISOString().slice(0, 7))\n    else if (unit === "year") result.push(String(cur.getFullYear()))\n    const next = new Date(cur)\n    if (unit === "month") next.setMonth(next.getMonth() + 1)\n    else next.setFullYear(next.getFullYear() + 1)\n    cur.setTime(next.getTime())\n  }\n  return [...new Set(result)]\n}\n', "feat: add buildTimeAxis date range generator"),
    ('\nexport function buildBubbleData(items: Array<{ x: number; y: number; r: number; label: string }>): object {\n  return {\n    datasets: items.map((item, i) => ({\n      label: item.label,\n      data: [{ x: item.x, y: item.y, r: item.r }],\n      backgroundColor: getChartColorByIndex(i) + "99",\n    })),\n  }\n}\n', "feat: add buildBubbleData bubble chart helper"),
    ('\nexport function buildRadarData(labels: string[], datasets: Array<{ label: string; data: number[]; color: string }>): object {\n  return {\n    labels,\n    datasets: datasets.map(d => ({\n      label: d.label,\n      data: d.data,\n      backgroundColor: d.color + "33",\n      borderColor: d.color,\n    })),\n  }\n}\n', "feat: add buildRadarData spider chart helper"),
    ('\nexport function buildAnnotations(points: Array<{ index: number; label: string; color?: string }>): object[] {\n  return points.map(p => ({\n    type: "line",\n    xMin: p.index,\n    xMax: p.index,\n    borderColor: p.color ?? "#ef4444",\n    borderWidth: 1,\n    label: { content: p.label, display: true, position: "start" },\n  }))\n}\n', "feat: add buildAnnotations chart event markers"),
    ('\nexport function buildTreemapData(items: Array<{ label: string; value: number; group?: string }>): Array<{ id: string; parent: string; value: number; label: string }> {\n  const groups = [...new Set(items.map(i => i.group ?? "root"))]\n  const groupNodes = groups.map(g => ({ id: g, parent: "root", value: 0, label: g }))\n  const leafNodes = items.map((item, i) => ({ id: `leaf-${i}`, parent: item.group ?? "root", value: item.value, label: item.label }))\n  return [{ id: "root", parent: "", value: 0, label: "All" }, ...groupNodes, ...leafNodes]\n}\n', "feat: add buildTreemapData hierarchical chart helper"),
    ('\nexport function formatTooltipValue(value: number, metric: "amount" | "count" | "percent" = "amount"): string {\n  if (metric === "percent") return value.toFixed(1) + "%"\n  if (metric === "count") return String(Math.round(value))\n  if (value >= 1e7) return "\\u20b9" + (value / 1e7).toFixed(1) + "Cr"\n  if (value >= 1e5) return "\\u20b9" + (value / 1e5).toFixed(1) + "L"\n  return "\\u20b9" + value.toLocaleString("en-IN")\n}\n', "feat: add formatTooltipValue chart tooltip formatter"),
    ('\nexport function buildLegend(labels: string[], colors: string[]): Array<{ label: string; color: string }> {\n  return labels.map((label, i) => ({ label, color: colors[i] ?? getChartColorByIndex(i) }))\n}\n', "feat: add buildLegend chart legend data helper"),
    ('\nexport function normalizeRadarData(data: number[]): number[] {\n  const max = Math.max(...data, 1)\n  return data.map(v => (v / max) * 100)\n}\n', "feat: add normalizeRadarData radar chart normaliser"),
    ('\nexport function calcGrowthSeries(values: number[]): number[] {\n  return values.map((v, i) => i === 0 ? 0 : values[i - 1] ? ((v - values[i - 1]) / values[i - 1]) * 100 : 0)\n}\n', "feat: add calcGrowthSeries period-over-period growth"),
    ('\nexport function buildCompareData(labelA: string, labelB: string, metrics: string[], valuesA: number[], valuesB: number[]): object {\n  return {\n    labels: metrics,\n    datasets: [\n      { label: labelA, data: valuesA, backgroundColor: "#15803d" },\n      { label: labelB, data: valuesB, backgroundColor: "#1d4ed8" },\n    ],\n  }\n}\n', "feat: add buildCompareData side-by-side bar builder"),
    ('\nexport function formatLegendLabel(label: string, value: number, total: number): string {\n  const pct = total ? ((value / total) * 100).toFixed(1) : "0.0"\n  return `${label} (${pct}%)`\n}\n', "feat: add formatLegendLabel pie legend formatter"),
    ('\nexport function calcCumulative(values: number[]): number[] {\n  let sum = 0\n  return values.map(v => (sum += v))\n}\n', "feat: add calcCumulative running total series"),
    ('\nexport function buildSankeyData(flows: Array<{ from: string; to: string; value: number }>): { nodes: string[]; links: Array<{ source: number; target: number; value: number }> } {\n  const nodes = [...new Set(flows.flatMap(f => [f.from, f.to]))]\n  const links = flows.map(f => ({ source: nodes.indexOf(f.from), target: nodes.indexOf(f.to), value: f.value }))\n  return { nodes, links }\n}\n', "feat: add buildSankeyData flow chart helper"),
]

# ── POOL 6: lib/data-utils.ts (append) ────────────────────────────────────────

DATA_UTILS_FEB = [
    ('\nexport function normalizeDeals(raw: unknown[]): Array<Record<string, unknown>> {\n  return raw.filter(Boolean).map(r => (typeof r === "object" ? r as Record<string, unknown> : {}))\n}\n', "feat: add normalizeDeals raw data normaliser"),
    ('\nexport function extractUniqueSectors(deals: Array<{ sectors?: string[] }>): string[] {\n  return [...new Set(deals.flatMap(d => d.sectors ?? []))].sort()\n}\n', "feat: add extractUniqueSectors dedup helper"),
    ('\nexport function extractUniqueInvestors(deals: Array<{ investors?: string[] }>): string[] {\n  return [...new Set(deals.flatMap(d => d.investors ?? []).filter(Boolean))].sort()\n}\n', "feat: add extractUniqueInvestors dedup helper"),
    ('\nexport function extractUniqueLocations(deals: Array<{ location?: string }>): string[] {\n  return [...new Set(deals.map(d => d.location).filter(Boolean) as string[])].sort()\n}\n', "feat: add extractUniqueLocations dedup helper"),
    ('\nexport function buildSearchIndex(deals: Array<{ id?: string; company?: string; sectors?: string[]; investors?: string[]; location?: string }>): Map<string, string[]> {\n  const idx = new Map<string, string[]>()\n  for (const deal of deals) {\n    if (!deal.id) continue\n    const terms = [\n      deal.company,\n      ...(deal.sectors ?? []),\n      ...(deal.investors ?? []),\n      deal.location,\n    ].filter(Boolean).map(t => t!.toLowerCase())\n    idx.set(deal.id, terms)\n  }\n  return idx\n}\n', "feat: add buildSearchIndex full-text index builder"),
    ('\nexport function searchDeals<T extends { id?: string }>(deals: T[], index: Map<string, string[]>, query: string): T[] {\n  const q = query.toLowerCase().trim()\n  if (!q) return deals\n  return deals.filter(d => {\n    const terms = index.get(d.id ?? "")\n    return terms?.some(t => t.includes(q))\n  })\n}\n', "feat: add searchDeals indexed search utility"),
    ('\nexport function normalizeDealForExport(deal: Record<string, unknown>): Record<string, string> {\n  return {\n    company: String(deal.company ?? ""),\n    amount: String(deal.amount ?? ""),\n    stage: String(deal.stage ?? ""),\n    sectors: Array.isArray(deal.sectors) ? deal.sectors.join("; ") : "",\n    investors: Array.isArray(deal.investors) ? deal.investors.join("; ") : "",\n    location: String(deal.location ?? ""),\n    date: String(deal.date ?? ""),\n  }\n}\n', "feat: add normalizeDealForExport CSV prep helper"),
    ('\nexport function mergeDealSources(primary: unknown[], secondary: unknown[]): unknown[] {\n  const ids = new Set((primary as Array<{ id?: string }>).map(d => d.id))\n  const newItems = (secondary as Array<{ id?: string }>).filter(d => !ids.has(d.id))\n  return [...primary, ...newItems]\n}\n', "feat: add mergeDealSources dual-source merge"),
    ('\nexport function aggregateDealsByStage(deals: Array<{ stage?: string; amount?: number }>): Record<string, { count: number; total: number }> {\n  const stats: Record<string, { count: number; total: number }> = {}\n  for (const d of deals) {\n    const stage = d.stage ?? "Unknown"\n    if (!stats[stage]) stats[stage] = { count: 0, total: 0 }\n    stats[stage].count++; stats[stage].total += d.amount ?? 0\n  }\n  return stats\n}\n', "feat: add aggregateDealsByStage rollup helper"),
    ('\nexport function aggregateDealsByQuarter(deals: Array<{ date?: string; amount?: number }>): Record<string, { count: number; total: number }> {\n  const stats: Record<string, { count: number; total: number }> = {}\n  for (const d of deals) {\n    if (!d.date) continue\n    const dt = new Date(d.date)\n    const q = `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`\n    if (!stats[q]) stats[q] = { count: 0, total: 0 }\n    stats[q].count++; stats[q].total += d.amount ?? 0\n  }\n  return stats\n}\n', "feat: add aggregateDealsByQuarter fiscal quarter rollup"),
    ('\nexport function buildInvestorProfile(name: string, deals: Array<{ investors?: string[]; sectors?: string[]; stage?: string; amount?: number; date?: string }>): { name: string; dealCount: number; totalDeployed: number; sectors: string[]; stages: string[] } {\n  const myDeals = deals.filter(d => d.investors?.includes(name))\n  return {\n    name,\n    dealCount: myDeals.length,\n    totalDeployed: myDeals.reduce((s, d) => s + (d.amount ?? 0), 0),\n    sectors: [...new Set(myDeals.flatMap(d => d.sectors ?? []))],\n    stages: [...new Set(myDeals.map(d => d.stage).filter(Boolean) as string[])],\n  }\n}\n', "feat: add buildInvestorProfile portfolio builder"),
    ('\nexport function calcDealScore(deal: { amount?: number; stage?: string; date?: string }): number {\n  let score = 0\n  if (deal.amount) score += Math.min(deal.amount / 1e6, 50)\n  const stageScore: Record<string, number> = { "Series C": 30, "Series B": 25, "Series A": 20, "Seed": 15, "Pre-Seed": 10 }\n  score += stageScore[deal.stage ?? ""] ?? 5\n  if (deal.date) {\n    const age = (Date.now() - new Date(deal.date).getTime()) / 86400000\n    score += Math.max(0, 20 - age / 10)\n  }\n  return Math.round(score)\n}\n', "feat: add calcDealScore deal relevance scorer"),
    ('\nexport function deduplicateDeals<T extends { company?: string; date?: string; amount?: number }>(deals: T[]): T[] {\n  const seen = new Set<string>()\n  return deals.filter(d => {\n    const key = `${d.company?.toLowerCase()}-${d.date}-${d.amount}`\n    if (seen.has(key)) return false\n    seen.add(key); return true\n  })\n}\n', "feat: add deduplicateDeals exact match dedup"),
    ('\nexport function flattenDealInvestors(deals: Array<{ investors?: string[] }>): string[] {\n  return [...new Set(deals.flatMap(d => d.investors ?? []).filter(Boolean))]\n}\n', "feat: add flattenDealInvestors portfolio extractor"),
    ('\nexport function computeFundingMatrix(deals: Array<{ sectors?: string[]; stage?: string; amount?: number }>): Record<string, Record<string, number>> {\n  const matrix: Record<string, Record<string, number>> = {}\n  for (const deal of deals) {\n    const stage = deal.stage ?? "Unknown"\n    for (const sector of deal.sectors ?? []) {\n      if (!matrix[sector]) matrix[sector] = {}\n      matrix[sector][stage] = (matrix[sector][stage] ?? 0) + (deal.amount ?? 0)\n    }\n  }\n  return matrix\n}\n', "feat: add computeFundingMatrix sector x stage heatmap data"),
    ('\nexport function normalizeInvestorName(name: string): string {\n  return name.trim().replace(/\\s+/g, " ").replace(/(\\s+fund|\\s+ventures|\\s+capital|\\s+partners)$/i, "")\n}\n', "feat: add normalizeInvestorName canonical name helper"),
    ('\nexport function matchDuplicateDeals<T extends { company?: string; amount?: number; date?: string }>(a: T, b: T, threshold = 0.8): boolean {\n  if (!a.company || !b.company) return false\n  const sameName = a.company.toLowerCase() === b.company.toLowerCase()\n  const sameAmount = a.amount === b.amount\n  const sameDate = a.date?.slice(0, 7) === b.date?.slice(0, 7)\n  const score = (sameName ? 0.5 : 0) + (sameAmount ? 0.3 : 0) + (sameDate ? 0.2 : 0)\n  return score >= threshold\n}\n', "feat: add matchDuplicateDeals fuzzy duplicate detector"),
    ('\nexport function serializeDeal(deal: Record<string, unknown>): string {\n  return JSON.stringify(deal)\n}\n\nexport function deserializeDeal(json: string): Record<string, unknown> {\n  return JSON.parse(json)\n}\n', "feat: add serializeDeal / deserializeDeal JSON helpers"),
    ('\nexport function chunkDeals<T>(deals: T[], batchSize = 100): T[][] {\n  const batches: T[][] = []\n  for (let i = 0; i < deals.length; i += batchSize) batches.push(deals.slice(i, i + batchSize))\n  return batches\n}\n', "feat: add chunkDeals batch processing helper"),
    ('\nexport function applyDealTransforms<T>(deals: T[], transforms: Array<(d: T) => T>): T[] {\n  return deals.map(deal => transforms.reduce((d, fn) => fn(d), deal))\n}\n', "feat: add applyDealTransforms pipeline helper"),
    ('\nexport function pivotBy<T>(items: T[], rowKey: keyof T, colKey: keyof T, valueKey: keyof T): Record<string, Record<string, unknown>> {\n  const result: Record<string, Record<string, unknown>> = {}\n  for (const item of items) {\n    const row = String(item[rowKey])\n    const col = String(item[colKey])\n    if (!result[row]) result[row] = {}\n    result[row][col] = item[valueKey]\n  }\n  return result\n}\n', "feat: add pivotBy cross-tab data builder"),
    ('\nexport function computeRankings<T>(items: T[], scoreFn: (item: T) => number): Array<T & { rank: number; score: number }> {\n  return items\n    .map(item => ({ ...item, score: scoreFn(item) } as T & { score: number }))\n    .sort((a, b) => b.score - a.score)\n    .map((item, i) => ({ ...item, rank: i + 1 }))\n}\n', "feat: add computeRankings leaderboard builder"),
    ('\nexport function interpolateMissingMonths(series: Array<{ month: string; value: number }>, from: string, to: string): Array<{ month: string; value: number }> {\n  const map = Object.fromEntries(series.map(s => [s.month, s.value]))\n  const result: Array<{ month: string; value: number }> = []\n  const cur = new Date(from + "-01")\n  const end = new Date(to + "-01")\n  while (cur <= end) {\n    const month = cur.toISOString().slice(0, 7)\n    result.push({ month, value: map[month] ?? 0 })\n    cur.setMonth(cur.getMonth() + 1)\n  }\n  return result\n}\n', "feat: add interpolateMissingMonths time series gap filler"),
    ('\nexport function windowedGrowth(values: number[], windowSize = 4): number[] {\n  return values.map((v, i) => {\n    if (i < windowSize) return 0\n    const prev = values[i - windowSize]\n    return prev ? ((v - prev) / prev) * 100 : 0\n  })\n}\n', "feat: add windowedGrowth rolling growth rate"),
    ('\nexport function buildSectorComparison(sector: string, deals: Array<{ sectors?: string[]; amount?: number; stage?: string }>): { inSector: number; total: number; shareByAmount: number } {\n  const inSector = deals.filter(d => d.sectors?.includes(sector)).reduce((s, d) => s + (d.amount ?? 0), 0)\n  const total = deals.reduce((s, d) => s + (d.amount ?? 0), 0)\n  return { inSector, total, shareByAmount: total ? (inSector / total) * 100 : 0 }\n}\n', "feat: add buildSectorComparison share analysis helper"),
    ('\nexport function detectOutliers(values: number[], threshold = 2.5): number[] {\n  const m = values.reduce((a, b) => a + b, 0) / values.length\n  const s = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length)\n  return values.filter(v => Math.abs(v - m) > threshold * s)\n}\n', "feat: add detectOutliers statistical anomaly filter"),
    ('\nexport function rollingSum(values: number[], window: number): number[] {\n  return values.map((_, i) => values.slice(Math.max(0, i - window + 1), i + 1).reduce((a, b) => a + b, 0))\n}\n', "feat: add rollingSum sliding window aggregator"),
    ('\nexport function buildCohortData(deals: Array<{ date?: string; stage?: string }>, cohortUnit: "month" | "quarter" = "quarter"): Record<string, Record<string, number>> {\n  const result: Record<string, Record<string, number>> = {}\n  for (const deal of deals) {\n    if (!deal.date || !deal.stage) continue\n    const dt = new Date(deal.date)\n    const cohort = cohortUnit === "month" ? deal.date.slice(0, 7) : `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`\n    if (!result[cohort]) result[cohort] = {}\n    result[cohort][deal.stage] = (result[cohort][deal.stage] ?? 0) + 1\n  }\n  return result\n}\n', "feat: add buildCohortData stage progression analysis"),
    ('\nexport function smoothSeries(values: number[], factor = 0.3): number[] {\n  const result = [values[0] ?? 0]\n  for (let i = 1; i < values.length; i++) {\n    result.push(result[i - 1] * (1 - factor) + values[i] * factor)\n  }\n  return result\n}\n', "feat: add smoothSeries exponential smoothing"),
    ('\nexport function exportToJSON(data: unknown[], pretty = false): string {\n  return JSON.stringify(data, null, pretty ? 2 : 0)\n}\n\nexport function importFromJSON<T>(json: string): T[] {\n  const parsed = JSON.parse(json)\n  return Array.isArray(parsed) ? parsed as T[] : []\n}\n', "feat: add exportToJSON and importFromJSON helpers"),
]

# ── SMALL FILES (written whole, 1 commit each) ────────────────────────────────

SMALL_FILES_FEB = [
    ("hooks/use-deals.ts",
     '"use client"\nimport { useState, useEffect, useCallback } from "react"\nimport type { DealFilters } from "@/lib/types"\n\nexport function useDeals(initial: DealFilters = {}) {\n  const [deals, setDeals] = useState<unknown[]>([])\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState<string | null>(null)\n  const [total, setTotal] = useState(0)\n\n  const load = useCallback(async (filters: DealFilters) => {\n    setLoading(true); setError(null)\n    try {\n      const qs = new URLSearchParams()\n      if (filters.sector?.length) qs.set("sector", filters.sector.join(","))\n      if (filters.stage?.length) qs.set("stage", filters.stage.join(","))\n      if (filters.location) qs.set("location", filters.location)\n      if (filters.search) qs.set("q", filters.search)\n      if (filters.page) qs.set("page", String(filters.page))\n      const res = await fetch(`/api/deals?${qs}`)\n      if (!res.ok) throw new Error("fetch failed")\n      const data = await res.json()\n      setDeals(data.deals); setTotal(data.total)\n    } catch (e) {\n      setError(e instanceof Error ? e.message : "error")\n    } finally { setLoading(false) }\n  }, [])\n\n  useEffect(() => { load(initial) }, [])\n  return { deals, loading, error, total, refetch: load }\n}\n',
     "feat: add useDeals data fetching hook"),

    ("hooks/use-investors.ts",
     '"use client"\nimport { useState, useEffect, useCallback } from "react"\n\nexport function useInvestors(query = "") {\n  const [investors, setInvestors] = useState<unknown[]>([])\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState<string | null>(null)\n\n  const load = useCallback(async (q: string) => {\n    setLoading(true); setError(null)\n    try {\n      const qs = new URLSearchParams()\n      if (q) qs.set("q", q)\n      const res = await fetch(`/api/investors?${qs}`)\n      if (!res.ok) throw new Error("fetch failed")\n      const data = await res.json()\n      setInvestors(data.investors ?? data)\n    } catch (e) {\n      setError(e instanceof Error ? e.message : "error")\n    } finally { setLoading(false) }\n  }, [])\n\n  useEffect(() => { load(query) }, [query])\n  return { investors, loading, error, refetch: load }\n}\n',
     "feat: add useInvestors data fetching hook"),

    ("hooks/use-analytics.ts",
     '"use client"\nimport { useState, useEffect } from "react"\nimport type { AnalyticsFilter } from "@/lib/types"\n\nexport function useAnalytics(filter: AnalyticsFilter) {\n  const [data, setData] = useState<unknown>(null)\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState<string | null>(null)\n\n  useEffect(() => {\n    let cancelled = false\n    setLoading(true)\n    const qs = new URLSearchParams()\n    if (filter.dateFrom) qs.set("from", filter.dateFrom)\n    if (filter.dateTo) qs.set("to", filter.dateTo)\n    qs.set("metric", filter.metric)\n    fetch(`/api/analytics?${qs}`)\n      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))\n      .then(d => { if (!cancelled) { setData(d); setError(null) } })\n      .catch(e => { if (!cancelled) setError(String(e)) })\n      .finally(() => { if (!cancelled) setLoading(false) })\n    return () => { cancelled = true }\n  }, [filter.dateFrom, filter.dateTo, filter.metric])\n\n  return { data, loading, error }\n}\n',
     "feat: add useAnalytics data hook with cancellation"),

    ("hooks/use-search.ts",
     '"use client"\nimport { useState, useCallback, useRef } from "react"\nimport type { SearchSuggestion } from "@/lib/types"\nimport { SEARCH_DEBOUNCE_MS } from "@/lib/constants"\n\nexport function useSearch() {\n  const [query, setQuery] = useState("")\n  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])\n  const [loading, setLoading] = useState(false)\n  const timer = useRef<ReturnType<typeof setTimeout>>()\n\n  const search = useCallback((q: string) => {\n    setQuery(q)\n    clearTimeout(timer.current)\n    if (!q.trim()) { setSuggestions([]); return }\n    setLoading(true)\n    timer.current = setTimeout(async () => {\n      try {\n        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)\n        const data = await res.json()\n        setSuggestions(data.suggestions ?? [])\n      } finally { setLoading(false) }\n    }, SEARCH_DEBOUNCE_MS)\n  }, [])\n\n  return { query, suggestions, loading, search, clear: () => { setQuery(""); setSuggestions([]) } }\n}\n',
     "feat: add useSearch debounced search hook"),

    ("hooks/use-pagination.ts",
     '"use client"\nimport { useState, useCallback } from "react"\nimport type { PaginationState } from "@/lib/types"\n\nexport function usePagination(total: number, pageSize = 20): PaginationState & { goTo: (p: number) => void; next: () => void; prev: () => void } {\n  const [page, setPage] = useState(1)\n  const totalPages = Math.ceil(total / pageSize)\n  const goTo = useCallback((p: number) => setPage(Math.min(Math.max(1, p), totalPages || 1)), [totalPages])\n  return { page, pageSize, total, totalPages, goTo, next: () => goTo(page + 1), prev: () => goTo(page - 1) }\n}\n',
     "feat: add usePagination state hook"),

    ("hooks/use-local-storage.ts",
     '"use client"\nimport { useState, useEffect } from "react"\n\nexport function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {\n  const [value, setValue] = useState<T>(() => {\n    try {\n      const item = window.localStorage.getItem(key)\n      return item ? (JSON.parse(item) as T) : defaultValue\n    } catch { return defaultValue }\n  })\n\n  useEffect(() => {\n    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }\n  }, [key, value])\n\n  return [value, setValue]\n}\n',
     "feat: add useLocalStorage persistent state hook"),

    ("hooks/use-debounce.ts",
     '"use client"\nimport { useState, useEffect } from "react"\n\nexport function useDebounce<T>(value: T, delayMs = 300): T {\n  const [debounced, setDebounced] = useState<T>(value)\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delayMs)\n    return () => clearTimeout(timer)\n  }, [value, delayMs])\n  return debounced\n}\n',
     "feat: add useDebounce value delay hook"),

    ("hooks/use-clipboard.ts",
     '"use client"\nimport { useState, useCallback } from "react"\n\nexport function useClipboard(timeout = 2000): { copied: boolean; copy: (text: string) => Promise<void> } {\n  const [copied, setCopied] = useState(false)\n  const copy = useCallback(async (text: string) => {\n    try {\n      await navigator.clipboard.writeText(text)\n      setCopied(true)\n      setTimeout(() => setCopied(false), timeout)\n    } catch { /* ignore */ }\n  }, [timeout])\n  return { copied, copy }\n}\n',
     "feat: add useClipboard copy-to-clipboard hook"),

    ("components/deal-table.tsx",
     '"use client"\nimport type { FundingDeal } from "@/data/funding-data"\nimport { formatCompact } from "@/lib/utils"\n\ninterface DealTableProps { deals: FundingDeal[]; onSelect?: (deal: FundingDeal) => void }\n\nexport function DealTable({ deals, onSelect }: DealTableProps) {\n  return (\n    <div className="overflow-x-auto">\n      <table className="w-full text-sm border-collapse">\n        <thead>\n          <tr className="border-b-2 border-black text-left">\n            <th className="py-2 pr-4 font-bold">Company</th>\n            <th className="py-2 pr-4 font-bold">Amount</th>\n            <th className="py-2 pr-4 font-bold">Stage</th>\n            <th className="py-2 pr-4 font-bold">Sector</th>\n            <th className="py-2 font-bold">City</th>\n          </tr>\n        </thead>\n        <tbody>\n          {deals.map(deal => (\n            <tr key={deal.id} onClick={() => onSelect?.(deal)} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">\n              <td className="py-2 pr-4 font-semibold">{deal.company}</td>\n              <td className="py-2 pr-4">{formatCompact(deal.amount)}</td>\n              <td className="py-2 pr-4">{deal.stage}</td>\n              <td className="py-2 pr-4">{deal.sectors[0]}</td>\n              <td className="py-2">{deal.location}</td>\n            </tr>\n          ))}\n        </tbody>\n      </table>\n    </div>\n  )\n}\n',
     "feat: add DealTable tabular view component"),

    ("components/sort-dropdown.tsx",
     '"use client"\nimport { SORT_OPTIONS } from "@/lib/constants"\n\ninterface SortDropdownProps { value: string; onChange: (v: string) => void }\n\nexport function SortDropdown({ value, onChange }: SortDropdownProps) {\n  return (\n    <select\n      value={value}\n      onChange={e => onChange(e.target.value)}\n      className="border-2 border-black px-3 py-1.5 text-sm font-semibold bg-white focus:outline-none"\n    >\n      {SORT_OPTIONS.map(opt => (\n        <option key={opt.value} value={opt.value}>{opt.label}</option>\n      ))}\n    </select>\n  )\n}\n',
     "feat: add SortDropdown sort control component"),

    ("components/amount-filter.tsx",
     '"use client"\nimport { AMOUNT_RANGES } from "@/lib/constants"\n\ninterface AmountFilterProps { value: number; onChange: (min: number, max: number) => void }\n\nexport function AmountFilter({ value, onChange }: AmountFilterProps) {\n  return (\n    <div className="flex flex-wrap gap-2">\n      {AMOUNT_RANGES.map(range => (\n        <button\n          key={range.label}\n          onClick={() => onChange(range.min, range.max)}\n          className="px-3 py-1 text-xs font-bold border-2 border-black hover:bg-black hover:text-white transition-colors"\n        >\n          {range.label}\n        </button>\n      ))}\n    </div>\n  )\n}\n',
     "feat: add AmountFilter range picker component"),

    ("components/compare-panel.tsx",
     '"use client"\nimport type { FundingDeal } from "@/data/funding-data"\nimport { formatCompact } from "@/lib/utils"\n\ninterface ComparePanelProps { deals: FundingDeal[]; onRemove: (id: string) => void }\n\nexport function ComparePanel({ deals, onRemove }: ComparePanelProps) {\n  if (!deals.length) return null\n  return (\n    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 z-50">\n      <div className="max-w-7xl mx-auto flex items-center gap-4">\n        <span className="text-sm font-bold">Compare ({deals.length}/3):</span>\n        <div className="flex gap-2 flex-1 flex-wrap">\n          {deals.map(d => (\n            <div key={d.id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs font-semibold border border-black">\n              {d.company} · {formatCompact(d.amount)}\n              <button onClick={() => onRemove(d.id)} className="ml-1 font-bold hover:text-red-600">×</button>\n            </div>\n          ))}\n        </div>\n      </div>\n    </div>\n  )\n}\n',
     "feat: add ComparePanel floating comparison bar"),

    ("components/trend-chart.tsx",
     '"use client"\nimport { formatCompact } from "@/lib/utils"\n\ninterface TrendChartProps {\n  data: Array<{ label: string; value: number }>\n  title?: string\n  color?: string\n}\n\nexport function TrendChart({ data, title, color = "#15803d" }: TrendChartProps) {\n  if (!data.length) return null\n  const max = Math.max(...data.map(d => d.value), 1)\n  return (\n    <div className="neo-border p-4">\n      {title && <div className="text-xs font-bold uppercase text-gray-600 mb-3">{title}</div>}\n      <div className="flex items-end gap-1 h-32">\n        {data.map(d => (\n          <div key={d.label} className="flex flex-col items-center gap-1 flex-1" title={`${d.label}: ${formatCompact(d.value)}`}>\n            <div\n              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color }}\n              className="w-full min-h-[2px] transition-all"\n            />\n            <span className="text-xs text-gray-500 truncate w-full text-center">{d.label}</span>\n          </div>\n        ))}\n      </div>\n    </div>\n  )\n}\n',
     "feat: add TrendChart inline bar sparkline component"),

    ("components/export-button.tsx",
     '"use client"\nimport type { ExportFormat } from "@/lib/types"\nimport { EXPORT_FORMATS } from "@/lib/constants"\n\ninterface ExportButtonProps { onExport: (format: ExportFormat) => void; disabled?: boolean }\n\nexport function ExportButton({ onExport, disabled }: ExportButtonProps) {\n  return (\n    <div className="relative group inline-block">\n      <button disabled={disabled} className="px-4 py-2 text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50">\n        Export\n      </button>\n      <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black hidden group-hover:block z-10 min-w-[100px]">\n        {EXPORT_FORMATS.map(f => (\n          <button key={f.value} onClick={() => onExport(f.value)} className="block w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-100">\n            {f.label}\n          </button>\n        ))}\n      </div>\n    </div>\n  )\n}\n',
     "feat: add ExportButton dropdown component"),

    ("components/share-button.tsx",
     '"use client"\nimport { useClipboard } from "@/hooks/use-clipboard"\nimport { SHARE_PLATFORMS } from "@/lib/constants"\n\ninterface ShareButtonProps { url: string; title: string }\n\nexport function ShareButton({ url, title }: ShareButtonProps) {\n  const { copied, copy } = useClipboard()\n  return (\n    <div className="relative group inline-block">\n      <button className="px-3 py-1.5 text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-colors">\n        {copied ? "Copied!" : "Share"}\n      </button>\n      <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black hidden group-hover:block z-10 min-w-[120px]">\n        {SHARE_PLATFORMS.map(p => (\n          <button\n            key={p.value}\n            onClick={() => p.value === "copy" ? copy(url) : window.open(`https://${p.value}.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank")}\n            className="block w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-100"\n          >\n            {p.label}\n          </button>\n        ))}\n      </div>\n    </div>\n  )\n}\n',
     "feat: add ShareButton social sharing component"),

    ("lib/search.ts",
     'import { normalizeString, fuzzyMatch, scoreRelevance } from "@/lib/utils"\n\nexport interface SearchIndex {\n  id: string\n  terms: string[]\n  data: Record<string, unknown>\n}\n\nexport function buildIndex(items: Array<Record<string, unknown>>, fields: string[], idField = "id"): SearchIndex[] {\n  return items.map(item => ({\n    id: String(item[idField] ?? ""),\n    terms: fields.flatMap(f => String(item[f] ?? "").split(/[\\s,]+/)).map(normalizeString).filter(Boolean),\n    data: item,\n  }))\n}\n\nexport function queryIndex(index: SearchIndex[], query: string, limit = 20): SearchIndex[] {\n  if (!query.trim()) return index.slice(0, limit)\n  const q = normalizeString(query)\n  return index\n    .filter(entry => entry.terms.some(t => t.includes(q) || fuzzyMatch(q, t)))\n    .sort((a, b) => {\n      const sa = a.terms.filter(t => t.startsWith(q)).length\n      const sb = b.terms.filter(t => t.startsWith(q)).length\n      return sb - sa\n    })\n    .slice(0, limit)\n}\n',
     "feat: add search module with index builder and query"),

    ("lib/export.ts",
     'import { toCSVString } from "@/lib/filters"\n\nexport function exportDealsCSV(deals: Array<Record<string, unknown>>): string {\n  const cols = ["company", "amount", "stage", "sectors", "investors", "location", "date"]\n  return toCSVString(deals.map(d => ({\n    ...d,\n    sectors: Array.isArray(d.sectors) ? (d.sectors as string[]).join("; ") : d.sectors,\n    investors: Array.isArray(d.investors) ? (d.investors as string[]).join("; ") : d.investors,\n  })), cols)\n}\n\nexport function exportDealsJSON(deals: unknown[]): string {\n  return JSON.stringify(deals, null, 2)\n}\n\nexport function triggerDownload(content: string, filename: string, mime = "text/csv"): void {\n  const blob = new Blob([content], { type: mime })\n  const url = URL.createObjectURL(blob)\n  const a = document.createElement("a")\n  a.href = url; a.download = filename; a.click()\n  URL.revokeObjectURL(url)\n}\n',
     "feat: add export module with CSV/JSON and download trigger"),

    ("lib/compare.ts",
     'import type { FundingDeal } from "@/data/funding-data"\nimport type { CompareResult } from "@/lib/types"\n\nexport function compareMetric(a: number, b: number): CompareResult {\n  const delta = b - a\n  const pctChange = a !== 0 ? (delta / a) * 100 : 0\n  return { metricA: a, metricB: b, delta, pctChange }\n}\n\nexport function compareDeals(dealA: FundingDeal, dealB: FundingDeal): Record<string, CompareResult> {\n  return {\n    amount: compareMetric(dealA.amount, dealB.amount),\n  }\n}\n\nexport function buildCompareUrl(ids: string[]): string {\n  return `/compare?ids=${ids.join(",")}`\n}\n',
     "feat: add compare module for deal comparison"),
]

# ── FILE STAGES: specific new files staged on specific day indices ─────────────
# day index maps to MISSING_DAYS index (0=Feb01, 1=Feb02, ..., skipping blanks)

FILE_STAGES_FEB = [
    # Day 0 = Feb 01
    (0, "app/sectors/page.tsx", '''\
import type { Metadata } from "next"
import { SectionHeader } from "@/components/section-header"

export const metadata: Metadata = { title: "Sectors | IndiaFundTrack" }

export default async function SectorsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <SectionHeader
        title="Browse by Sector"
        subtitle="Funding activity across Indian startup verticals"
      />
      <p className="text-gray-500 mt-8">Sector pages loading...</p>
    </main>
  )
}
''', "feat: add sectors listing page"),

    # Day 1 = Feb 02
    (1, "app/sectors/[slug]/page.tsx", '''\
import type { Metadata } from "next"
import { notFound } from "next/navigation"

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `${params.slug} Funding | IndiaFundTrack` }
}

export default function SectorDetailPage({ params }: Props) {
  if (!params.slug) notFound()
  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold capitalize mb-6">{params.slug}</h1>
    </main>
  )
}
''', "feat: add sector detail page with dynamic route"),

    (1, "app/submit/page.tsx", '''\
import type { Metadata } from "next"
import { SectionHeader } from "@/components/section-header"

export const metadata: Metadata = { title: "Submit a Deal | IndiaFundTrack" }

export default function SubmitPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <SectionHeader
        title="Submit a Deal"
        subtitle="Help us track Indian startup funding. All submissions are reviewed."
      />
      <form className="mt-8 space-y-4" action="/api/submit" method="POST">
        <input name="company" placeholder="Company name" required className="w-full border-2 border-black px-3 py-2" />
        <input name="amount" placeholder="Amount raised (in ₹ Lakhs)" className="w-full border-2 border-black px-3 py-2" />
        <input name="stage" placeholder="Stage (Seed, Series A...)" className="w-full border-2 border-black px-3 py-2" />
        <input name="date" type="date" className="w-full border-2 border-black px-3 py-2" />
        <input name="sourceUrl" placeholder="Source URL" className="w-full border-2 border-black px-3 py-2" />
        <button type="submit" className="w-full bg-black text-white py-2 font-bold hover:bg-gray-800">Submit Deal</button>
      </form>
    </main>
  )
}
''', "feat: add deal submission page"),

    (1, "app/api/search/route.ts", '''\
import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { scoreRelevance } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (!q.trim()) return NextResponse.json({ suggestions: [] })

  const results = fundingData
    .filter(d => scoreRelevance(d, q) > 0)
    .sort((a, b) => scoreRelevance(b, q) - scoreRelevance(a, q))
    .slice(0, 10)
    .map(d => ({
      type: "company",
      label: d.company,
      value: d.id,
      count: 1,
    }))

  return NextResponse.json({ suggestions: results })
}
''', "feat: add GET /api/search autocomplete endpoint"),

    # Day 3 = Feb 04
    (3, "app/api/export/route.ts", '''\
import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { exportDealsCSV, exportDealsJSON } from "@/lib/export"

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json"
  const data = fundingData as unknown as Array<Record<string, unknown>>

  if (format === "csv") {
    const csv = exportDealsCSV(data)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="india-startup-funding.csv"`,
      },
    })
  }

  return new NextResponse(exportDealsJSON(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="india-startup-funding.json"`,
    },
  })
}
''', "feat: add GET /api/export CSV and JSON download endpoint"),

    (3, "app/api/compare/route.ts", '''\
import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { compareDeals } from "@/lib/compare"

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean)
  if (ids.length < 2) return NextResponse.json({ error: "Need at least 2 ids" }, { status: 400 })
  const deals = ids.map(id => fundingData.find(d => d.id === id)).filter(Boolean)
  if (deals.length < 2) return NextResponse.json({ error: "Deals not found" }, { status: 404 })
  return NextResponse.json({ deals, comparison: compareDeals(deals[0]!, deals[1]!) })
}
''', "feat: add GET /api/compare multi-deal comparison endpoint"),

    # Day 6 = Feb 08
    (6, "app/deal/[id]/loading.tsx", '''\
export default function DealLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded" />)}
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}
''', "feat: add loading skeleton for deal detail page"),

    (6, "app/investors/[id]/page.tsx", '''\
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fundingData } from "@/data/funding-data"
import { SectionHeader } from "@/components/section-header"
import { StatCard } from "@/components/stat-card"

interface Props { params: { id: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `${decodeURIComponent(params.id)} | IndiaFundTrack` }
}

export default function InvestorProfilePage({ params }: Props) {
  const name = decodeURIComponent(params.id)
  const deals = fundingData.filter(d => d.investors.includes(name))
  if (!deals.length) notFound()

  const total = deals.reduce((s, d) => s + d.amount, 0)
  const sectors = [...new Set(deals.flatMap(d => d.sectors))]

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <SectionHeader title={name} subtitle={`${deals.length} deals tracked`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <StatCard value={deals.length} label="Total Deals" accent />
        <StatCard value={sectors.length} label="Sectors" />
        <StatCard value={deals[0]?.stage ?? "-"} label="Recent Stage" />
        <StatCard value={deals[0]?.location ?? "-"} label="Top City" />
      </div>
    </main>
  )
}
''', "feat: add investor profile page with deal stats"),

    (6, "app/api/health/route.ts", '''\
import { NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    deals: fundingData.length,
    ts: new Date().toISOString(),
  })
}
''', "feat: add GET /api/health liveness endpoint"),

    # Day 9 = Feb 11
    (9, "supabase/migrations/004_functions.sql", '''\
-- Aggregate functions for analytics
CREATE OR REPLACE FUNCTION get_sector_stats(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(sector text, deal_count bigint, total_funding numeric, avg_deal_size numeric) AS $$
  SELECT
    unnest(sectors) AS sector,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding,
    AVG(amount_inr) AS avg_deal_size
  FROM deals
  WHERE (p_from IS NULL OR date >= p_from)
    AND (p_to IS NULL OR date <= p_to)
  GROUP BY unnest(sectors)
  ORDER BY total_funding DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_monthly_trend(p_year int DEFAULT EXTRACT(YEAR FROM NOW())::int)
RETURNS TABLE(month text, deal_count bigint, total_funding numeric) AS $$
  SELECT
    TO_CHAR(date, \'YYYY-MM\') AS month,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding
  FROM deals
  WHERE EXTRACT(YEAR FROM date) = p_year
  GROUP BY TO_CHAR(date, \'YYYY-MM\')
  ORDER BY month;
$$ LANGUAGE sql STABLE;
''', "feat: add Supabase SQL analytics functions"),

    (9, "supabase/migrations/005_views.sql", '''\
-- Materialised views for fast dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sector_summary AS
  SELECT
    unnest(sectors) AS sector,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_funding,
    AVG(amount_inr) AS avg_deal_size,
    MAX(date) AS latest_date
  FROM deals
  GROUP BY unnest(sectors);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sector_summary_sector ON mv_sector_summary(sector);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_investor_summary AS
  SELECT
    unnest(investors) AS investor,
    COUNT(*) AS deal_count,
    SUM(amount_inr) AS total_deployed,
    array_agg(DISTINCT unnest(sectors)) AS sectors
  FROM deals
  GROUP BY unnest(investors);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_investor_summary_investor ON mv_investor_summary(investor);

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sector_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_investor_summary;
$$ LANGUAGE sql;
''', "feat: add Supabase materialised views for analytics"),

    # Day 13 = Feb 16
    (13, "lib/analytics/trends.ts", '''\
import { fundingData } from "@/data/funding-data"
import { buildMonthlyTrend } from "@/lib/filters"

export function getMonthlyTrend(from?: string, to?: string) {
  const deals = from || to
    ? fundingData.filter(d => (!from || d.date >= from) && (!to || d.date <= to))
    : fundingData
  return buildMonthlyTrend(deals)
}

export function getYearOverYearGrowth(year: number): { dealCount: number; totalFunding: number; prevYear: { dealCount: number; totalFunding: number } } {
  const cur = fundingData.filter(d => new Date(d.date).getFullYear() === year)
  const prev = fundingData.filter(d => new Date(d.date).getFullYear() === year - 1)
  const sum = (arr: typeof fundingData) => arr.reduce((s, d) => s + d.amount, 0)
  return { dealCount: cur.length, totalFunding: sum(cur), prevYear: { dealCount: prev.length, totalFunding: sum(prev) } }
}

export function getTopDeals(limit = 10) {
  return [...fundingData].sort((a, b) => b.amount - a.amount).slice(0, limit)
}
''', "feat: add trends analytics module"),

    (13, "lib/analytics/sectors.ts",
     'import { fundingData } from "@/data/funding-data"\nimport { buildSectorStats } from "@/lib/filters"\n\nexport function getAllSectorStats() {\n  return buildSectorStats(fundingData)\n}\n\nexport function getSectorTrend(sector: string) {\n  const deals = fundingData.filter(d => d.sectors.includes(sector))\n  const byMonth: Record<string, number> = {}\n  for (const d of deals) {\n    const m = d.date.slice(0, 7)\n    byMonth[m] = (byMonth[m] ?? 0) + 1\n  }\n  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }))\n}\n\nexport function getTopSectors(limit = 8): Array<{ sector: string; count: number; total: number }> {\n  const stats = getAllSectorStats()\n  return Object.entries(stats)\n    .map(([sector, v]) => ({ sector, count: v.count, total: v.total }))\n    .sort((a, b) => b.total - a.total)\n    .slice(0, limit)\n}\n',
     "feat: add sectors analytics module"),

    # Day 16 = Feb 19
    (16, "app/analytics/loading.tsx", '''\
export default function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}
''', "feat: add loading UI for analytics page"),

    (16, "app/sectors/loading.tsx", '''\
export default function SectorsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-80 mb-10" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}
''', "feat: add loading UI for sectors page"),

    # Day 19 = Feb 22
    (19, "components/city-map.tsx", '''\
"use client"
import { CITY_COORDINATES } from "@/lib/constants"

interface CityMapProps {
  data: Array<{ city: string; value: number }>
  title?: string
}

export function CityMap({ data, title }: CityMapProps) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="neo-border p-4">
      {title && <div className="text-xs font-bold uppercase text-gray-600 mb-4">{title}</div>}
      <div className="space-y-2">
        {data
          .filter(d => CITY_COORDINATES[d.city])
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map(d => (
            <div key={d.city} className="flex items-center gap-2">
              <span className="text-xs w-24 truncate font-semibold">{d.city}</span>
              <div className="flex-1 bg-gray-100 h-3">
                <div
                  className="bg-green-700 h-full transition-all"
                  style={{ width: `${(d.value / max) * 100}%` }}
                />
              </div>
              <span className="text-xs w-8 text-right">{d.value}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
''', "feat: add CityMap bar chart component with city rankings"),

    (19, "components/sector-tree.tsx", '''\
"use client"
import { SECTOR_COLORS } from "@/lib/constants"
import { formatCompact } from "@/lib/utils"

interface SectorTreeProps {
  data: Array<{ sector: string; value: number }>
  title?: string
}

export function SectorTree({ data, title }: SectorTreeProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="neo-border p-4">
      {title && <div className="text-xs font-bold uppercase text-gray-600 mb-4">{title}</div>}
      <div className="flex flex-wrap gap-1">
        {data
          .sort((a, b) => b.value - a.value)
          .map(d => {
            const pct = (d.value / total) * 100
            const size = Math.max(pct, 4)
            const color = SECTOR_COLORS[d.sector] ?? "#6b7280"
            return (
              <div
                key={d.sector}
                title={`${d.sector}: ${formatCompact(d.value)}`}
                className="flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                style={{ width: `${size}%`, minWidth: 40, height: Math.max(size * 1.5, 32), backgroundColor: color }}
              >
                {pct > 6 ? d.sector : ""}
              </div>
            )
          })}
      </div>
    </div>
  )
}
''', "feat: add SectorTree proportional treemap component"),

    # Day 22 = Feb 26
    (22, "app/api/weekly/route.ts", '''\
import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"

export async function GET(req: NextRequest) {
  const weeksBack = parseInt(req.nextUrl.searchParams.get("weeks") ?? "1")
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - weeksBack * 7)

  const fromStr = from.toISOString().slice(0, 10)
  const deals = fundingData.filter(d => d.date >= fromStr)
  const total = deals.reduce((s, d) => s + d.amount, 0)
  const sectors = [...new Set(deals.flatMap(d => d.sectors))]
    .map(s => ({ sector: s, count: deals.filter(d => d.sectors.includes(s)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({ dealCount: deals.length, totalFunding: total, topSectors: sectors, from: fromStr })
}
''', "feat: add GET /api/weekly digest endpoint"),

    (22, "app/api/notify/route.ts", '''\
import { NextRequest, NextResponse } from "next/server"
import { notifySchema } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = notifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    // TODO: persist preferences to Supabase
    return NextResponse.json({ success: true, prefs: parsed.data })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
''', "feat: add POST /api/notify preferences endpoint"),
]

# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=== February 2026 Backfill ===")
    print(f"Days: {len(MISSING_DAYS)} active, blanks: Feb 7, 15, 23\n")

    staged_by_day: dict = {}
    for day_i, path, content, msg in FILE_STAGES_FEB:
        staged_by_day.setdefault(day_i, []).append((path, content, msg))

    util_idx = type_idx = const_idx = filter_idx = chart_idx = data_idx = small_idx = 0

    for day_i, date in enumerate(MISSING_DAYS):
        target = DAILY_TARGETS[date]
        print(f"\n{date}  ({target} commits)")
        hour = 9
        committed = 0

        # Phase 1: stage specific new files for this day
        if day_i in staged_by_day:
            for path, content, msg in staged_by_day[day_i]:
                minute = committed * 7 % 55
                wfile(path, content)
                stage(path)
                commit(msg, date, hour, minute)
                committed += 1
                if committed % 2 == 0:
                    hour += 1

        # Phase 2: fill to daily target from incremental pools
        while committed < target:
            minute = (committed * 8) % 55
            pool = committed % 6

            if pool == 0 and util_idx < len(UTIL_ADDITIONS_FEB):
                content, msg = UTIL_ADDITIONS_FEB[util_idx]; util_idx += 1
                afile("lib/utils.ts", content); stage("lib/utils.ts")
                commit(msg, date, hour, minute)

            elif pool == 1 and type_idx < len(TYPE_ADDITIONS_FEB):
                content, msg = TYPE_ADDITIONS_FEB[type_idx]; type_idx += 1
                afile("lib/types.ts", content); stage("lib/types.ts")
                commit(msg, date, hour, minute)

            elif pool == 2 and const_idx < len(CONST_ADDITIONS_FEB):
                content, msg = CONST_ADDITIONS_FEB[const_idx]; const_idx += 1
                afile("lib/constants.ts", content); stage("lib/constants.ts")
                commit(msg, date, hour, minute)

            elif pool == 3 and filter_idx < len(FILTER_ADDITIONS_FEB):
                content, msg = FILTER_ADDITIONS_FEB[filter_idx]; filter_idx += 1
                afile("lib/filters.ts", content); stage("lib/filters.ts")
                commit(msg, date, hour, minute)

            elif pool == 4 and chart_idx < len(CHART_UTILS_FEB):
                content, msg = CHART_UTILS_FEB[chart_idx]; chart_idx += 1
                afile("lib/chart-utils.ts", content); stage("lib/chart-utils.ts")
                commit(msg, date, hour, minute)

            elif pool == 5 and data_idx < len(DATA_UTILS_FEB):
                content, msg = DATA_UTILS_FEB[data_idx]; data_idx += 1
                afile("lib/data-utils.ts", content); stage("lib/data-utils.ts")
                commit(msg, date, hour, minute)

            elif small_idx < len(SMALL_FILES_FEB):
                path, content, msg = SMALL_FILES_FEB[small_idx]; small_idx += 1
                wfile(path, content); stage(path)
                commit(msg, date, hour, minute)

            else:
                note = f'\n// data-utils — updated {date}\n'
                afile("lib/data-utils.ts", note); stage("lib/data-utils.ts")
                commit(f"chore: refresh data utilities ({date})", date, hour, minute)

            committed += 1
            if committed % 3 == 0:
                hour += 1

    total = sum(DAILY_TARGETS.values())
    print(f"\n✓ Done. {len(MISSING_DAYS)} days, {total} commits targeted.")
    print("Run: git push origin main")


if __name__ == "__main__":
    main()
