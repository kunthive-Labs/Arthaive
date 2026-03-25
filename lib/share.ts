export function filtersToParams(filters: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else {
      params.set(key, String(value))
    }
  }
  return params
}

export function paramsToFilters(params: URLSearchParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {}
  for (const key of params.keys()) {
    const values = params.getAll(key)
    filters[key] = values.length === 1 ? values[0] : values
  }
  return filters
}

export function getShareUrl(filters: Record<string, unknown>): string {
  const params = filtersToParams(filters)
  const qs = params.toString()
  return `${location.origin}/explore${qs ? `?${qs}` : ""}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
