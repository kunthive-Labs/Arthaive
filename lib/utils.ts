import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats funding amount for display
 * @param amount - Amount in lakhs (100 = 1 Crore)
 * @returns Formatted string with ₹ symbol or "Not Disclosed"
 */
export function formatFundingAmount(amount: number): string {
  if (amount === 0 || amount === null || amount === undefined) {
    return "Not Disclosed"
  }

  const crores = amount / 100

  // For amounts >= 1000 Cr, show in Billions
  if (crores >= 1000) {
    return `₹${(crores / 1000).toFixed(2)}B`
  }

  // For amounts >= 1 Cr, show in Crores
  if (crores >= 1) {
    return `₹${crores.toFixed(crores >= 100 ? 0 : 1)}Cr`
  }

  // For amounts < 1 Cr, show in Lakhs
  return `₹${amount.toFixed(0)}L`
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
