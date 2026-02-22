
export function buildQueryString(filters: Record<string, string | string[] | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue
    params.set(k, Array.isArray(v) ? v.join(",") : String(v))
  }
  return params.toString()
}

export function parseQueryString(search: string): Record<string, string | string[]> {
  const params = new URLSearchParams(search)
  const result: Record<string, string | string[]> = {}
  for (const [k, v] of params.entries()) {
    result[k] = v.includes(",") ? v.split(",") : v
  }
  return result
}

export function countActiveFilters(filters: Record<string, unknown>): number {
  return Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0
    return v !== "" && v !== undefined && v !== null && v !== 1
  }).length
}

export function mergeFilters<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  return { ...base, ...patch, page: 1 }
}

export function filtersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function serializeFilters(filters: Record<string, unknown>): string {
  return btoa(JSON.stringify(filters))
}

export function deserializeFilters<T>(encoded: string): T | null {
  try { return JSON.parse(atob(encoded)) as T } catch { return null }
}

export function removeFilterValue(filters: Record<string, string | string[]>, key: string, value: string): Record<string, string | string[]> {
  const current = filters[key]
  if (Array.isArray(current)) return { ...filters, [key]: current.filter(v => v !== value) }
  return { ...filters, [key]: "" }
}

export function getStageColor(stage: string): string {
  const map: Record<string, string> = {
    "Pre-Seed": "bg-purple-100 text-purple-800",
    "Seed": "bg-green-100 text-green-800",
    "Series A": "bg-blue-100 text-blue-800",
    "Series B": "bg-indigo-100 text-indigo-800",
    "Series C": "bg-yellow-100 text-yellow-800",
    "Debt": "bg-gray-100 text-gray-800",
    "Bridge": "bg-orange-100 text-orange-800",
  }
  return map[stage] ?? "bg-gray-100 text-gray-700"
}

export function sortDealsByField<T extends Record<string, unknown>>(deals: T[], field: keyof T, order: "asc" | "desc" = "desc"): T[] {
  return [...deals].sort((a, b) => {
    const av = a[field], bv = b[field]
    if (typeof av === "number" && typeof bv === "number") return order === "asc" ? av - bv : bv - av
    return order === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })
}

export function paginateArray<T>(arr: T[], page: number, size: number): { items: T[]; total: number; totalPages: number } {
  const total = arr.length
  const totalPages = Math.ceil(total / size)
  const items = arr.slice((page - 1) * size, page * size)
  return { items, total, totalPages }
}

export function buildMonthlyTrend(deals: Array<{ date?: string; amount?: number }>): Array<{ month: string; count: number; total: number }> {
  const byMonth: Record<string, { count: number; total: number }> = {}
  for (const deal of deals) {
    if (!deal.date) continue
    const month = deal.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0 }
    byMonth[month].count++; byMonth[month].total += deal.amount ?? 0
  }
  return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }))
}

export function topN<T>(items: T[], n: number, scoreFn: (item: T) => number): T[] {
  return [...items].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, n)
}

export function deduplicateByKey<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set()
  return arr.filter(item => { const k = item[key]; if (seen.has(k)) return false; seen.add(k); return true })
}

export function buildSectorStats(deals: Array<{ sectors?: string[]; amount?: number }>): Record<string, { count: number; total: number }> {
  const stats: Record<string, { count: number; total: number }> = {}
  for (const deal of deals) {
    for (const sector of deal.sectors ?? []) {
      if (!stats[sector]) stats[sector] = { count: 0, total: 0 }
      stats[sector].count++; stats[sector].total += deal.amount ?? 0
    }
  }
  return stats
}

export function buildCityStats(deals: Array<{ location?: string; amount?: number }>): Record<string, { count: number; total: number }> {
  const stats: Record<string, { count: number; total: number }> = {}
  for (const deal of deals) {
    const city = deal.location ?? "Unknown"
    if (!stats[city]) stats[city] = { count: 0, total: 0 }
    stats[city].count++; stats[city].total += deal.amount ?? 0
  }
  return stats
}

export function pickRandom<T>(arr: T[], n = 1): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

export function invertRecord<T extends string>(rec: Record<T, string>): Record<string, T> {
  return Object.fromEntries(Object.entries(rec).map(([k, v]) => [v, k])) as Record<string, T>
}

export function calcPortfolioStats(amounts: number[]): { total: number; avg: number; count: number } {
  const total = amounts.reduce((a, b) => a + b, 0)
  return { count: amounts.length, total, avg: amounts.length ? total / amounts.length : 0 }
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  return text.replace(regex, "<mark>$1</mark>")
}

export function filterDeals<T extends { stage?: string; sectors?: string[]; location?: string; amount?: number }>(deals: T[], f: { stage?: string[]; sectors?: string[]; location?: string; minAmount?: number; maxAmount?: number }): T[] {
  return deals.filter(d => {
    if (f.stage?.length && d.stage && !f.stage.includes(d.stage)) return false
    if (f.sectors?.length && !d.sectors?.some(s => f.sectors!.includes(s))) return false
    if (f.location && d.location !== f.location) return false
    if (f.minAmount != null && (d.amount ?? 0) < f.minAmount) return false
    if (f.maxAmount != null && (d.amount ?? 0) > f.maxAmount) return false
    return true
  })
}

export function normalizeAmount(raw: number | string | undefined): number {
  if (typeof raw === "number") return raw
  if (!raw) return 0
  return parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0
}

export function buildInvestorIndex(deals: Array<{ investors?: string[] }>): Record<string, number> {
  const idx: Record<string, number> = {}
  for (const deal of deals) {
    for (const inv of deal.investors ?? []) {
      idx[inv] = (idx[inv] ?? 0) + 1
    }
  }
  return idx
}
