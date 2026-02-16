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
