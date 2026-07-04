import { normalizeString, fuzzyMatch } from "@/lib/utils"

export interface SearchIndex {
  id: string
  terms: string[]
  data: Record<string, unknown>
}

export function buildIndex(items: Array<Record<string, unknown>>, fields: string[], idField = "id"): SearchIndex[] {
  return items.map(item => ({
    id: String(item[idField] ?? ""),
    terms: fields.flatMap(f => String(item[f] ?? "").split(/[\s,]+/)).map(normalizeString).filter(Boolean),
    data: item,
  }))
}

export function queryIndex(index: SearchIndex[], query: string, limit = 20): SearchIndex[] {
  if (!query.trim()) return index.slice(0, limit)
  const q = normalizeString(query)
  return index
    .filter(entry => entry.terms.some(t => t.includes(q) || fuzzyMatch(q, t)))
    .sort((a, b) => {
      const sa = a.terms.filter(t => t.startsWith(q)).length
      const sb = b.terms.filter(t => t.startsWith(q)).length
      return sb - sa
    })
    .slice(0, limit)
}
