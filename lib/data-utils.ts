
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
