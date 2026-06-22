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
  return `${company} · ${stage} | Arthaive`
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


export function clipAmount(amount: number, max = 10000): number {
  return Math.min(amount, max)
}


export function safeDealUrl(dealId: string | undefined): string {
  if (!dealId) return "/explore"
  return buildDealUrl(dealId)
}


export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === "number" && isFinite(amount) && amount >= 0
}


export function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}


export function financialYear(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return month < 4 ? `FY${String(year - 1).slice(2)}-${String(year).slice(2)}`
    : `FY${String(year).slice(2)}-${String(year + 1).slice(2)}`
}


export function dealAgeInDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}


const USD_RATE = 83.5

export function inrToUsd(crores: number): number {
  return Math.round((crores * 10_000_000) / USD_RATE)
}

export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}


export function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://arthaive.kunthive.in"
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}


export function canonicalUrl(path: string): string {
  return absoluteUrl(path).split("?")[0]
}


export function buildDealMetaDescription(
  company: string,
  amount: number,
  stage: string,
  sectors: string[]
): string {
  const sectorStr = sectors.slice(0, 2).join(" and ")
  return `${company} raised ₹${amount.toLocaleString("en-IN")} Cr in ${stage} funding. ${sectorStr} sector. Track all Indian startup deals.`
}


export function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ]
  return lines.join("\n")
}


export function memoKey(...parts: (string | number | boolean | null | undefined)[]): string {
  return parts.map((p) => String(p ?? "")).join("|")
}


export function buildAvatarSrcSet(baseUrl: string): string {
  return [32, 64, 128].map((s) => `${baseUrl}?w=${s} ${s}w`).join(", ")
}


export function isMobileWidth(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < 768
}


export function saveScrollPosition(key: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
}

export function restoreScrollPosition(key: string) {
  if (typeof window === "undefined") return
  const y = Number(sessionStorage.getItem(`scroll:${key}`) ?? 0)
  window.scrollTo({ top: y, behavior: "instant" })
}


export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const el = document.createElement("textarea")
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
    return true
  } catch {
    return false
  }
}
