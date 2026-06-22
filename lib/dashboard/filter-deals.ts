import type { FundingDeal } from "@/data/funding-data"
import type { WidgetConfig } from "./types"

// Apply a widget's per-instance config to the full deal set before handing it
// to a chart. An empty/unset field is a no-op, so a blank config returns all
// deals untouched.
export function filterDeals(deals: FundingDeal[], config: WidgetConfig = {}): FundingDeal[] {
  const { sectors, stages, yearFrom, yearTo } = config
  const hasSectors = sectors && sectors.length > 0
  const hasStages = stages && stages.length > 0

  if (!hasSectors && !hasStages && yearFrom === undefined && yearTo === undefined) {
    return deals
  }

  return deals.filter((d) => {
    if (hasSectors && !(d.sectors ?? []).some((s) => sectors!.includes(s))) return false
    if (hasStages && !stages!.includes(d.stage)) return false
    if (yearFrom !== undefined || yearTo !== undefined) {
      const year = Number(d.date?.slice(0, 4))
      if (Number.isNaN(year)) return false
      if (yearFrom !== undefined && year < yearFrom) return false
      if (yearTo !== undefined && year > yearTo) return false
    }
    return true
  })
}

// Distinct sorted sectors across the dataset (for the filter UI).
export function allSectors(deals: FundingDeal[]): string[] {
  const set = new Set<string>()
  for (const d of deals) for (const s of d.sectors ?? []) set.add(s)
  return Array.from(set).sort()
}

// Distinct stages across the dataset (for the filter UI).
export function allStages(deals: FundingDeal[]): string[] {
  const set = new Set<string>()
  for (const d of deals) if (d.stage) set.add(d.stage)
  return Array.from(set).sort()
}

// Year range present in the dataset.
export function yearRange(deals: FundingDeal[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const d of deals) {
    const y = Number(d.date?.slice(0, 4))
    if (Number.isNaN(y)) continue
    if (y < min) min = y
    if (y > max) max = y
  }
  if (!Number.isFinite(min)) return [2015, new Date().getFullYear()]
  return [min, max]
}
