import { fundingData } from "@/data/funding-data"
import { buildSectorStats } from "@/lib/filters"

export function getAllSectorStats() {
  return buildSectorStats(fundingData)
}

export function getSectorTrend(sector: string) {
  const deals = fundingData.filter(d => d.sectors.includes(sector))
  const byMonth: Record<string, number> = {}
  for (const d of deals) {
    const m = d.date.slice(0, 7)
    byMonth[m] = (byMonth[m] ?? 0) + 1
  }
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }))
}

export function getTopSectors(limit = 8): Array<{ sector: string; count: number; total: number }> {
  const stats = getAllSectorStats()
  return Object.entries(stats)
    .map(([sector, v]) => ({ sector, count: v.count, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
