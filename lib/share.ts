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


export function buildDealUrl(dealId: string): string {
  return `/deal/${encodeURIComponent(dealId)}`
}


export function buildInvestorUrl(name: string): string {
  return `/investors/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`
}


export function buildSectorUrl(sector: string): string {
  return `/sectors/${encodeURIComponent(sector.toLowerCase().replace(/\s+/g, "-"))}`
}


export function getShareTitle(company: string, stage: string): string {
  return `${company} · ${stage} | India Startup Funding`
}


export function encodeFilters(filters: Record<string, unknown>): string {
  return btoa(JSON.stringify(filters))
}

export function decodeFilters(encoded: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(encoded))
  } catch {
    return {}
  }
}


export function diffFilters(
  base: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(current)) {
    if (JSON.stringify(v) !== JSON.stringify(base[k])) diff[k] = v
  }
  return diff
}


export function formatAmount(amount: number): string {
  if (amount >= 10000) return `₹${(amount / 1000).toFixed(1)}K Cr`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K Cr`
  return `₹${amount.toLocaleString("en-IN")} Cr`
}


export function isoDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr)
  return d.getDay() === 0 ? 7 : d.getDay()
}


export function quarterLabel(dateStr: string): string {
  const month = parseInt(dateStr.slice(5, 7), 10)
  const year = dateStr.slice(2, 4)
  const q = Math.ceil(month / 3)
  return `Q${q} FY${year}`
}


export function getOgImageUrl(type: "deal" | "sector" | "investor", slug: string): string {
  return `/api/og?type=${type}&slug=${encodeURIComponent(slug)}`
}
