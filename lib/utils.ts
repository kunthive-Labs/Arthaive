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
