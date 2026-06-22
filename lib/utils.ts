import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatInrLakhs } from '@/lib/format'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats funding amount for display.
 *
 * Delegates to the canonical {@link formatInrLakhs} so every surface renders an
 * amount identically. Kept as a thin alias because many call sites import this
 * name directly.
 *
 * @param amount - Amount in INR lakhs (100 = 1 Crore)
 * @returns Formatted string with ₹ symbol or "Not Disclosed"
 */
export function formatFundingAmount(amount: number): string {
  if (!amount) return "Not Disclosed"
  return formatInrLakhs(amount)
}

/**
 * Checks if a funding amount is disclosed
 */
export function isFundingDisclosed(amount: number): boolean {
  return amount > 0
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

export function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function truncateText(text: string, maxLen = 80): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

export function formatYear(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString()
}

// utility module — last updated 2026-01-06

// utility module — last updated 2026-01-06

// utility module — last updated 2026-01-08

// utility module — last updated 2026-01-08

export function getQuarter(dateStr: string): string {
  const m = new Date(dateStr).getMonth()
  return `Q${Math.floor(m / 3) + 1}`
}

// utility module — last updated 2026-01-08

// utility module — last updated 2026-01-08

// utility module — last updated 2026-01-10

// utility module — last updated 2026-01-10

export function formatAmountUSD(usd: number): string {
  if (!usd) return "N/A"
  return usd >= 1 ? `$${usd.toFixed(1)}M` : `$${(usd * 1000).toFixed(0)}K`
}

// utility module — last updated 2026-01-10

// utility module — last updated 2026-01-10

// utility module — last updated 2026-01-10

// utility module — last updated 2026-01-11

// utility module — last updated 2026-01-11

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// utility module — last updated 2026-01-11

// utility module — last updated 2026-01-11

// utility module — last updated 2026-01-11

// utility module — last updated 2026-01-12

// utility module — last updated 2026-01-12

export function sortByDate<T extends { date: string }>(arr: T[], asc = false): T[] {
  return [...arr].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    return asc ? diff : -diff
  })
}

// utility module — last updated 2026-01-12

// utility module — last updated 2026-01-12

// utility module — last updated 2026-01-12

// utility module — last updated 2026-01-13

// utility module — last updated 2026-01-13

export function groupByYear<T extends { date: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const y = formatYear(item.date)
    ;(acc[y] ??= []).push(item)
    return acc
  }, {})
}

// utility module — last updated 2026-01-13

// utility module — last updated 2026-01-13

// utility module — last updated 2026-01-13

// utility module — last updated 2026-01-14

// utility module — last updated 2026-01-14

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 300): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }
}

// utility module — last updated 2026-01-14

// utility module — last updated 2026-01-14

// utility module — last updated 2026-01-14

// utility module — last updated 2026-01-15

// utility module — last updated 2026-01-15

export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

// utility module — last updated 2026-01-15

// utility module — last updated 2026-01-15

// utility module — last updated 2026-01-15

// utility module — last updated 2026-01-16

// utility module — last updated 2026-01-16

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

// utility module — last updated 2026-01-16

// utility module — last updated 2026-01-16

// utility module — last updated 2026-01-16

// utility module — last updated 2026-01-18

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Pick<T, K>)
}

// utility module — last updated 2026-01-18

// utility module — last updated 2026-01-18

// utility module — last updated 2026-01-18

// utility module — last updated 2026-01-19

// utility module — last updated 2026-01-19

// utility module — last updated 2026-01-19

export function formatStage(stage: string): string {
  const map: Record<string, string> = { "Pre-Seed": "PSd", "Seed": "Seed", "Series A": "S-A", "Series B": "S-B", "Series C": "S-C", "Bridge": "Brg", "Debt": "Debt" }
  return map[stage] ?? stage
}

// utility module — last updated 2026-01-19

// utility module — last updated 2026-01-19

// utility module — last updated 2026-01-19

// utility module — last updated 2026-01-20

// utility module — last updated 2026-01-20

// utility module — last updated 2026-01-20

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + "s")
}

// utility module — last updated 2026-01-20

// utility module — last updated 2026-01-20

// utility module — last updated 2026-01-20

export function parseSearchParams(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search).entries())
}

// utility module — last updated 2026-01-21

// utility module — last updated 2026-01-21

// utility module — last updated 2026-01-21

export function getDaysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
}

// utility module — last updated 2026-01-21

// utility module — last updated 2026-01-21

// utility module — last updated 2026-01-21

export function formatRelativeDate(dateStr: string): string {
  const days = getDaysBetween(dateStr, new Date().toISOString())
  if (days < 7) return `${Math.round(days)}d ago`
  if (days < 30) return `${Math.round(days / 7)}w ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-22

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-23

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-24

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-25

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-26

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-27

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-28

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-29

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-30

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

// utility module — last updated 2026-01-31

export function parseAmount(str: string): number {
  const n = parseFloat(str.replace(/[\u20b9$,\s]/g, ""))
  return isNaN(n) ? 0 : n
}

export function compareAmounts(a: number, b: number): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatGrowth(prev: number, curr: number): string {
  if (!prev) return "N/A"
  const pct = ((curr - prev) / prev) * 100
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"
}

export function formatPercentage(value: number, decimals = 1): string {
  return value.toFixed(decimals) + "%"
}

export function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function mean(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

export function stddev(nums: number[]): number {
  const m = mean(nums)
  return Math.sqrt(mean(nums.map(n => (n - m) ** 2)))
}

export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, m => "-" + m.toLowerCase())
}

export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n))
}

export function formatCompact(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + "Cr"
  if (n >= 1e5) return (n / 1e5).toFixed(1) + "L"
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return String(n)
}

export function calcYoY(prev: number, curr: number): number {
  return prev === 0 ? 0 : ((curr - prev) / prev) * 100
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

export function flatUnique<T>(arrays: T[][]): T[] {
  return [...new Set(arrays.flat())]
}

export function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0)
}

export function maxBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  return arr.reduce<T | undefined>((max, item) => !max || fn(item) > fn(max) ? item : max, undefined)
}

export function minBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  return arr.reduce<T | undefined>((min, item) => !min || fn(item) < fn(min) ? item : min, undefined)
}

export function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = fn(item);(acc[key] ??= []).push(item); return acc
  }, {})
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const copy = { ...obj } as T
  for (const k of keys) delete copy[k]
  return copy
}

export function mapValues<T, U>(obj: Record<string, T>, fn: (v: T, k: string) => U): Record<string, U> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]))
}

export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key in override) {
    const v = override[key]
    if (v && typeof v === "object" && !Array.isArray(v)) {
      result[key] = deepMerge(base[key] as Record<string, unknown>, v as Record<string, unknown>) as T[typeof key]
    } else if (v !== undefined) { result[key] = v as T[typeof key] }
  }
  return result
}

export function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function fuzzyMatch(query: string, target: string): boolean {
  const q = normalizeString(query), t = normalizeString(target)
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export function scoreRelevance(deal: { company?: string; sectors?: string[]; description?: string }, query: string): number {
  const q = query.toLowerCase()
  let score = 0
  if (deal.company?.toLowerCase().includes(q)) score += 3
  if (deal.sectors?.some(s => s.toLowerCase().includes(q))) score += 2
  if (deal.description?.toLowerCase().includes(q)) score += 1
  return score
}

export function formatDealAge(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function isRecentDeal(dateStr: string, withinDays = 30): boolean {
  return (Date.now() - new Date(dateStr).getTime()) / 86400000 <= withinDays
}

export function zipArrays<A, B>(a: A[], b: B[]): Array<[A, B]> {
  const len = Math.min(a.length, b.length)
  return Array.from({ length: len }, (_, i) => [a[i], b[i]])
}
