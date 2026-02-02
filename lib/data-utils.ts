
export function normalizeDeals(raw: unknown[]): Array<Record<string, unknown>> {
  return raw.filter(Boolean).map(r => (typeof r === "object" ? r as Record<string, unknown> : {}))
}

export function extractUniqueSectors(deals: Array<{ sectors?: string[] }>): string[] {
  return [...new Set(deals.flatMap(d => d.sectors ?? []))].sort()
}
