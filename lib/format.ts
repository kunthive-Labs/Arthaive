import { LAKHS_PER_CRORE } from "@/lib/constants"

/**
 * Canonical INR funding formatter.
 *
 * THE single source of truth for rendering a funding amount. Every call site
 * (deal cards, deal detail, hero stats, the home ticker, analytics KPIs/ticker)
 * routes through this so the same amount always reads identically — never the
 * old mix of `₹100Cr` vs `₹100 Cr` vs `₹1K Cr`.
 *
 * Output tiers (Indian convention), always `₹` + space-separated unit:
 *   - >= 1 lakh crore   → `₹X.XX L Cr`
 *   - >= 1 thousand crore → `₹X.XK Cr`
 *   - >= 1 crore        → `₹X Cr`   (Indian digit grouping, no decimals)
 *   - < 1 crore (but > 0) → `₹X L`  (lakhs, no decimals)
 *   - 0 / null / NaN    → "Undisclosed"
 *
 * @param crores - amount in INR **crores** (1 Cr = 100 lakh = 1,00,00,000 ₹)
 */
export function formatInrCrores(crores: number): string {
  if (!crores || crores <= 0 || Number.isNaN(crores)) return "Undisclosed"

  // >= 1 lakh crore (1e5 Cr)
  if (crores >= 1e5) return `₹${(crores / 1e5).toFixed(2)} L Cr`
  // >= 1 thousand crore
  if (crores >= 1e3) return `₹${(crores / 1e3).toFixed(1)}K Cr`
  // >= 1 crore — whole crores with Indian grouping
  if (crores >= 1) return `₹${Math.round(crores).toLocaleString("en-IN")} Cr`
  // < 1 crore → show in lakhs
  return `₹${Math.round(crores * LAKHS_PER_CRORE).toLocaleString("en-IN")} L`
}

/**
 * Same canonical formatter, but for amounts stored in INR **lakhs**
 * (the unit used by the raw deal records, where 100 lakh = 1 Cr).
 *
 * Thin wrapper over {@link formatInrCrores} — converts lakhs → crores first so
 * the displayed value is identical to passing the equivalent crore figure.
 *
 * @param lakhs - amount in INR lakhs (100 = ₹1 Cr)
 */
export function formatInrLakhs(lakhs: number): string {
  if (!lakhs || lakhs <= 0 || Number.isNaN(lakhs)) return "Undisclosed"
  return formatInrCrores(lakhs / LAKHS_PER_CRORE)
}

export function lakhsToCrores(lakhs: number): number {
  return lakhs / LAKHS_PER_CRORE
}

export function croresToLakhs(crores: number): number {
  return crores * LAKHS_PER_CRORE
}

export function usdToInr(usd: number, rate = 84.5): number {
  return usd * rate
}

export function inrToUsd(inr: number, rate = 84.5): number {
  return inr / rate
}

export function formatCurrency(amount: number, currency: "INR" | "USD" = "INR"): string {
  if (currency === "USD") {
    return amount >= 1 ? `$${amount.toFixed(1)}M` : `$${(amount * 1000).toFixed(0)}K`
  }
  const crores = amount / 100
  if (crores >= 1000) return `₹${(crores / 1000).toFixed(1)}B`
  if (crores >= 1) return `₹${crores.toFixed(1)}Cr`
  return `₹${amount.toFixed(0)}L`
}
