import type { FundingDeal as Deal } from "@/data/funding-data"

function featureVector(deal: Deal, allSectors: string[], allStages: string[]): number[] {
  const sectorVec = allSectors.map((s) => (deal.sectors?.includes(s) ? 1 : 0))
  const stageVec = allStages.map((s) => (deal.stage === s ? 1 : 0))
  const amountBucket = Math.min(Math.floor(Math.log10(deal.amount + 1)), 4)
  return [...sectorVec, ...stageVec, amountBucket / 4]
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return magA && magB ? dot / (magA * magB) : 0
}

export function getSimilarDeals(
  target: Deal,
  allDeals: Deal[],
  n = 5
): Deal[] {
  const allSectors = [...new Set(allDeals.flatMap((d) => d.sectors ?? []))]
  const allStages = [...new Set(allDeals.map((d) => d.stage))]

  const targetVec = featureVector(target, allSectors, allStages)

  return allDeals
    .filter((d) => d.id !== target.id)
    .map((deal) => ({
      deal,
      score: cosineSimilarity(targetVec, featureVector(deal, allSectors, allStages)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ deal }) => deal)
}


export function getRelatedSectors(
  targetSectors: string[],
  allDeals: import("@/data/funding-data").FundingDeal[]
): string[] {
  const coOccurrence = new Map<string, number>()
  for (const d of allDeals) {
    if (!d.sectors?.some((s) => targetSectors.includes(s))) continue
    for (const s of d.sectors ?? []) {
      if (!targetSectors.includes(s)) {
        coOccurrence.set(s, (coOccurrence.get(s) ?? 0) + 1)
      }
    }
  }
  return Array.from(coOccurrence.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([s]) => s)
}


export function getTopInvestorsByDeals(
  deals: import("@/data/funding-data").FundingDeal[],
  n = 10
): string[] {
  const counts = new Map<string, number>()
  for (const d of deals) {
    if (d.leadInvestor) counts.set(d.leadInvestor, (counts.get(d.leadInvestor) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name]) => name)
}


export function buildSectorCoOccurrence(
  deals: import("@/data/funding-data").FundingDeal[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>()
  for (const deal of deals) {
    const sectors = deal.sectors ?? []
    for (const s1 of sectors) {
      if (!matrix.has(s1)) matrix.set(s1, new Map())
      for (const s2 of sectors) {
        if (s1 === s2) continue
        matrix.get(s1)!.set(s2, (matrix.get(s1)!.get(s2) ?? 0) + 1)
      }
    }
  }
  return matrix
}


export function getInvestorDeals(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
) {
  return deals.filter(
    (d) => d.leadInvestor === investorName || d.investors?.includes(investorName)
  )
}


const STAGE_ORDER = [
  "Angel","Pre-Seed","Seed","Pre-Series A","Series A",
  "Pre-Series B","Series B","Series C","Series D","Series E+",
]

export function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage)
}

export function nextStage(stage: string): string | null {
  const i = stageIndex(stage)
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null
}


export function getWeeklyStats(
  deals: import("@/data/funding-data").FundingDeal[]
): { week: string; count: number; total: number }[] {
  const map = new Map<string, { count: number; total: number }>()
  for (const d of deals) {
    const week = d.weekFolder
    const cur = map.get(week) ?? { count: 0, total: 0 }
    map.set(week, { count: cur.count + 1, total: cur.total + d.amount })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, ...v }))
}


export function getCoInvestors(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
): Map<string, number> {
  const coInvestors = new Map<string, number>()
  for (const deal of deals) {
    if (!deal.investors?.includes(investorName) && deal.leadInvestor !== investorName) continue
    for (const inv of deal.investors ?? []) {
      if (inv !== investorName) coInvestors.set(inv, (coInvestors.get(inv) ?? 0) + 1)
    }
  }
  return coInvestors
}


export function dealMomentumScore(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[],
  windowDays = 30
): number {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)
  const recent = deals.filter((d) => d.date >= cutoff && d.sectors?.includes(sector)).length
  const total = deals.filter((d) => d.sectors?.includes(sector)).length
  return total > 0 ? Math.round((recent / total) * 100) : 0
}


export function sectorGrowthRate(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  const byYear = new Map<string, number>()
  for (const d of deals) {
    if (!d.sectors?.includes(sector)) continue
    const year = d.date.slice(0, 4)
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount)
  }
  const years = Array.from(byYear.keys()).sort()
  if (years.length < 2) return 0
  const last = byYear.get(years.at(-1)!)!
  const prev = byYear.get(years.at(-2)!)!
  return prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0
}


export function detectFundingCycles(
  deals: import("@/data/funding-data").FundingDeal[]
): { month: string; dealCount: number }[] {
  const monthMap = new Map<string, number>()
  for (const d of deals) {
    const key = d.date.slice(0, 7)
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  }
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 24)
    .map(([month, dealCount]) => ({ month, dealCount }))
}


export type RoundCategory = "early" | "growth" | "late" | "debt" | "other"

export function classifyRound(stage: string): RoundCategory {
  if (["Angel","Pre-Seed","Seed","Pre-Series A"].includes(stage)) return "early"
  if (["Series A","Pre-Series B","Series B"].includes(stage)) return "growth"
  if (["Series C","Series D","Series E+","Growth"].includes(stage)) return "late"
  if (stage === "Debt") return "debt"
  return "other"
}


export function sectorPerformanceScore(
  sector: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  const sectorDeals = deals.filter((d) => d.sectors?.includes(sector))
  if (!sectorDeals.length) return 0
  const avgAmount = sectorDeals.reduce((s, d) => s + d.amount, 0) / sectorDeals.length
  const recency = sectorDeals.filter(
    (d) => d.date >= new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  ).length
  return Math.round((avgAmount / 100) * 0.5 + recency * 2)
}


export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (!startValue || !years) return 0
  return Math.round(((Math.pow(endValue / startValue, 1 / years) - 1) * 100) * 10) / 10
}


export function dealDensity(
  sector: string,
  city: string,
  deals: import("@/data/funding-data").FundingDeal[]
): number {
  return deals.filter(
    (d) => d.sectors?.includes(sector) && d.location === city
  ).length
}


export function investorStageBreakdown(
  investorName: string,
  deals: import("@/data/funding-data").FundingDeal[]
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const d of deals) {
    if (d.leadInvestor !== investorName && !d.investors?.includes(investorName)) continue
    result[d.stage] = (result[d.stage] ?? 0) + 1
  }
  return result
}


export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/pvt\.?\s*ltd\.?/gi, "")
    .replace(/private\s+limited/gi, "")
    .replace(/(inc|llc|ltd)\.?/gi, "")
    .trim()
}


export function findDuplicateDeals(
  deals: import("@/data/funding-data").FundingDeal[]
): string[][] {
  const groups: Record<string, string[]> = {}
  for (const d of deals) {
    const key = `${normalizeCompanyName(d.company)}__${d.date.slice(0, 7)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(d.id)
  }
  return Object.values(groups).filter((g) => g.length > 1)
}


export function detectAmountOutliers(
  deals: import("@/data/funding-data").FundingDeal[],
  zThreshold = 3
): string[] {
  const amounts = deals.map((d) => d.amount)
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length
  const std = Math.sqrt(amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length)
  return deals
    .filter((d) => Math.abs(d.amount - mean) > zThreshold * std)
    .map((d) => d.id)
}
