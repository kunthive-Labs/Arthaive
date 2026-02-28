
export function normalizeDeals(raw: unknown[]): Array<Record<string, unknown>> {
  return raw.filter(Boolean).map(r => (typeof r === "object" ? r as Record<string, unknown> : {}))
}

export function extractUniqueSectors(deals: Array<{ sectors?: string[] }>): string[] {
  return [...new Set(deals.flatMap(d => d.sectors ?? []))].sort()
}

export function extractUniqueInvestors(deals: Array<{ investors?: string[] }>): string[] {
  return [...new Set(deals.flatMap(d => d.investors ?? []).filter(Boolean))].sort()
}

export function extractUniqueLocations(deals: Array<{ location?: string }>): string[] {
  return [...new Set(deals.map(d => d.location).filter(Boolean) as string[])].sort()
}

export function buildSearchIndex(deals: Array<{ id?: string; company?: string; sectors?: string[]; investors?: string[]; location?: string }>): Map<string, string[]> {
  const idx = new Map<string, string[]>()
  for (const deal of deals) {
    if (!deal.id) continue
    const terms = [
      deal.company,
      ...(deal.sectors ?? []),
      ...(deal.investors ?? []),
      deal.location,
    ].filter(Boolean).map(t => t!.toLowerCase())
    idx.set(deal.id, terms)
  }
  return idx
}

export function searchDeals<T extends { id?: string }>(deals: T[], index: Map<string, string[]>, query: string): T[] {
  const q = query.toLowerCase().trim()
  if (!q) return deals
  return deals.filter(d => {
    const terms = index.get(d.id ?? "")
    return terms?.some(t => t.includes(q))
  })
}

export function normalizeDealForExport(deal: Record<string, unknown>): Record<string, string> {
  return {
    company: String(deal.company ?? ""),
    amount: String(deal.amount ?? ""),
    stage: String(deal.stage ?? ""),
    sectors: Array.isArray(deal.sectors) ? deal.sectors.join("; ") : "",
    investors: Array.isArray(deal.investors) ? deal.investors.join("; ") : "",
    location: String(deal.location ?? ""),
    date: String(deal.date ?? ""),
  }
}

export function mergeDealSources(primary: unknown[], secondary: unknown[]): unknown[] {
  const ids = new Set((primary as Array<{ id?: string }>).map(d => d.id))
  const newItems = (secondary as Array<{ id?: string }>).filter(d => !ids.has(d.id))
  return [...primary, ...newItems]
}

export function aggregateDealsByStage(deals: Array<{ stage?: string; amount?: number }>): Record<string, { count: number; total: number }> {
  const stats: Record<string, { count: number; total: number }> = {}
  for (const d of deals) {
    const stage = d.stage ?? "Unknown"
    if (!stats[stage]) stats[stage] = { count: 0, total: 0 }
    stats[stage].count++; stats[stage].total += d.amount ?? 0
  }
  return stats
}

export function aggregateDealsByQuarter(deals: Array<{ date?: string; amount?: number }>): Record<string, { count: number; total: number }> {
  const stats: Record<string, { count: number; total: number }> = {}
  for (const d of deals) {
    if (!d.date) continue
    const dt = new Date(d.date)
    const q = `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`
    if (!stats[q]) stats[q] = { count: 0, total: 0 }
    stats[q].count++; stats[q].total += d.amount ?? 0
  }
  return stats
}

export function buildInvestorProfile(name: string, deals: Array<{ investors?: string[]; sectors?: string[]; stage?: string; amount?: number; date?: string }>): { name: string; dealCount: number; totalDeployed: number; sectors: string[]; stages: string[] } {
  const myDeals = deals.filter(d => d.investors?.includes(name))
  return {
    name,
    dealCount: myDeals.length,
    totalDeployed: myDeals.reduce((s, d) => s + (d.amount ?? 0), 0),
    sectors: [...new Set(myDeals.flatMap(d => d.sectors ?? []))],
    stages: [...new Set(myDeals.map(d => d.stage).filter(Boolean) as string[])],
  }
}

export function calcDealScore(deal: { amount?: number; stage?: string; date?: string }): number {
  let score = 0
  if (deal.amount) score += Math.min(deal.amount / 1e6, 50)
  const stageScore: Record<string, number> = { "Series C": 30, "Series B": 25, "Series A": 20, "Seed": 15, "Pre-Seed": 10 }
  score += stageScore[deal.stage ?? ""] ?? 5
  if (deal.date) {
    const age = (Date.now() - new Date(deal.date).getTime()) / 86400000
    score += Math.max(0, 20 - age / 10)
  }
  return Math.round(score)
}

export function deduplicateDeals<T extends { company?: string; date?: string; amount?: number }>(deals: T[]): T[] {
  const seen = new Set<string>()
  return deals.filter(d => {
    const key = `${d.company?.toLowerCase()}-${d.date}-${d.amount}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

export function flattenDealInvestors(deals: Array<{ investors?: string[] }>): string[] {
  return [...new Set(deals.flatMap(d => d.investors ?? []).filter(Boolean))]
}

export function computeFundingMatrix(deals: Array<{ sectors?: string[]; stage?: string; amount?: number }>): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  for (const deal of deals) {
    const stage = deal.stage ?? "Unknown"
    for (const sector of deal.sectors ?? []) {
      if (!matrix[sector]) matrix[sector] = {}
      matrix[sector][stage] = (matrix[sector][stage] ?? 0) + (deal.amount ?? 0)
    }
  }
  return matrix
}

export function normalizeInvestorName(name: string): string {
  return name.trim().replace(/\s+/g, " ").replace(/(\s+fund|\s+ventures|\s+capital|\s+partners)$/i, "")
}

export function matchDuplicateDeals<T extends { company?: string; amount?: number; date?: string }>(a: T, b: T, threshold = 0.8): boolean {
  if (!a.company || !b.company) return false
  const sameName = a.company.toLowerCase() === b.company.toLowerCase()
  const sameAmount = a.amount === b.amount
  const sameDate = a.date?.slice(0, 7) === b.date?.slice(0, 7)
  const score = (sameName ? 0.5 : 0) + (sameAmount ? 0.3 : 0) + (sameDate ? 0.2 : 0)
  return score >= threshold
}

export function serializeDeal(deal: Record<string, unknown>): string {
  return JSON.stringify(deal)
}

export function deserializeDeal(json: string): Record<string, unknown> {
  return JSON.parse(json)
}

// data-utils — updated 2026-02-25

// data-utils — updated 2026-02-26

export function chunkDeals<T>(deals: T[], batchSize = 100): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < deals.length; i += batchSize) batches.push(deals.slice(i, i + batchSize))
  return batches
}

// data-utils — updated 2026-02-26

// data-utils — updated 2026-02-26

// data-utils — updated 2026-02-27

// data-utils — updated 2026-02-27

// data-utils — updated 2026-02-28

// data-utils — updated 2026-02-28
