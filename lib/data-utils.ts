
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
