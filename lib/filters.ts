
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
