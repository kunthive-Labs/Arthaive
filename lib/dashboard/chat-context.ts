// Builds the compact `dashboardContext` JSON string sent with every chat
// message so the AI analyst knows what the user is looking at. Client-safe:
// it only reads the deals array the builder already holds — no data fetching.

import type { FundingDeal } from "@/data/funding-data"
import type { DashboardWidget, KpiMetric, WidgetConfig } from "./types"
import { DATA_USD_RATE } from "@/lib/supabase/config"

// Server-side cap is 6000 chars; stay comfortably under it.
const MAX_CONTEXT_CHARS = 4_000
const TOP_SECTORS = 8
const TOP_INVESTORS = 8

// The dashboard fields the context needs (the builder passes its staged
// working copy, which is not a full persisted Dashboard row).
export interface ChatDashboardInfo {
  name: string
  widgets: DashboardWidget[]
}

interface DatasetDigest {
  totalDeals: number
  yearFrom: number | null
  yearTo: number | null
  /** Top sectors by total disclosed funding, in millions of USD. */
  topSectorsByFundingUsdM: Array<{ sector: string; totalUsdM: number }>
  dealCountsByStage: Record<string, number>
  topInvestorsByDealCount: Array<{ investor: string; deals: number }>
}

/** ₹ lakh → millions of USD at the dataset's flat rate (0 for undisclosed). */
function lakhsToUsdMillions(amountLakhs: number): number {
  if (!amountLakhs || amountLakhs <= 0 || !Number.isFinite(amountLakhs)) return 0
  return (amountLakhs * 100_000) / DATA_USD_RATE / 1_000_000
}

// The deals array is a stable server-provided prop, so cache the digest per
// array identity — the O(n) scan runs once, not on every widget edit.
const digestCache = new WeakMap<FundingDeal[], DatasetDigest>()

function computeDatasetDigest(deals: FundingDeal[]): DatasetDigest {
  const cached = digestCache.get(deals)
  if (cached) return cached

  let yearFrom: number | null = null
  let yearTo: number | null = null
  const sectorUsdM = new Map<string, number>()
  const stageCounts = new Map<string, number>()
  const investorDeals = new Map<string, number>()

  for (const d of deals) {
    const year = Number(d.date?.slice(0, 4))
    if (!Number.isNaN(year)) {
      if (yearFrom === null || year < yearFrom) yearFrom = year
      if (yearTo === null || year > yearTo) yearTo = year
    }
    const usdM = lakhsToUsdMillions(d.amount)
    for (const s of new Set(d.sectors ?? [])) {
      if (s) sectorUsdM.set(s, (sectorUsdM.get(s) ?? 0) + usdM)
    }
    if (d.stage) stageCounts.set(d.stage, (stageCounts.get(d.stage) ?? 0) + 1)
    for (const inv of new Set(d.investors ?? [])) {
      if (inv) investorDeals.set(inv, (investorDeals.get(inv) ?? 0) + 1)
    }
  }

  const digest: DatasetDigest = {
    totalDeals: deals.length,
    yearFrom,
    yearTo,
    topSectorsByFundingUsdM: [...sectorUsdM.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_SECTORS)
      .map(([sector, usdM]) => ({ sector, totalUsdM: Math.round(usdM) })),
    dealCountsByStage: Object.fromEntries(
      [...stageCounts.entries()].sort((a, b) => b[1] - a[1])
    ),
    topInvestorsByDealCount: [...investorDeals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_INVESTORS)
      .map(([investor, deals]) => ({ investor, deals })),
  }
  digestCache.set(deals, digest)
  return digest
}

// Drop empty config fields so widgets serialize compactly.
function compactConfig(config: WidgetConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (config.sectors?.length) out.sectors = config.sectors
  if (config.stages?.length) out.stages = config.stages
  if (config.yearFrom !== undefined) out.yearFrom = config.yearFrom
  if (config.yearTo !== undefined) out.yearTo = config.yearTo
  if (config.topN !== undefined) out.topN = config.topN
  if (config.metric !== undefined) out.metric = config.metric
  return out
}

/**
 * Serialize the active dashboard + a digest of the dataset into a compact JSON
 * string (≤4000 chars). If the widget list makes it too long, widgets are
 * truncated (with a `widgetsOmitted` count) until it fits; the dataset digest
 * itself is bounded so the minimal payload always fits.
 */
export function buildDashboardContext(
  dashboard: ChatDashboardInfo,
  deals: FundingDeal[]
): string {
  const dataset = computeDatasetDigest(deals)
  const widgets = dashboard.widgets.map((w) => ({
    type: w.type,
    ...(w.config.title ? { title: w.config.title } : {}),
    config: compactConfig(w.config),
  }))

  // Shrink the widget list until the payload fits the cap.
  for (const cap of [widgets.length, 16, 8, 4, 0]) {
    const included = widgets.slice(0, cap)
    const omitted = widgets.length - included.length
    const json = JSON.stringify({
      dashboardName: dashboard.name,
      widgets: included,
      ...(omitted > 0 ? { widgetsOmitted: omitted } : {}),
      dataset,
    })
    if (json.length <= MAX_CONTEXT_CHARS) return json
  }

  // Unreachable in practice (the zero-widget payload is well under the cap),
  // but guarantee a valid, in-budget string regardless.
  return JSON.stringify({
    dashboardName: dashboard.name.slice(0, 120),
    widgets: [],
    widgetsOmitted: widgets.length,
    dataset: { totalDeals: dataset.totalDeals, yearFrom: dataset.yearFrom, yearTo: dataset.yearTo },
  })
}

// ---------------------------------------------------------------------------
// Widget-suggestion config sanitizing (chat → builder)
// ---------------------------------------------------------------------------

// Mirrors KpiMetric in ./types.
const KPI_METRICS: readonly KpiMetric[] = [
  "total_capital",
  "deal_count",
  "avg_round",
  "unique_investors",
  "unique_sectors",
  "unique_cities",
  "largest_round",
]

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value.filter((v): v is string => typeof v === "string" && v.length > 0)
  return strings.length ? strings.slice(0, 20) : undefined
}

function asInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined
}

/**
 * Convert a chat widget suggestion's config into a valid WidgetConfig:
 * unknown keys are dropped, values are type-checked, and the suggestion's
 * title becomes the widget title.
 */
export function suggestionToWidgetConfig(
  config: Record<string, unknown>,
  title: string
): WidgetConfig {
  const out: WidgetConfig = {}
  const trimmedTitle = title.trim()
  if (trimmedTitle) out.title = trimmedTitle.slice(0, 120)

  const sectors = asStringArray(config.sectors)
  if (sectors) out.sectors = sectors
  const stages = asStringArray(config.stages)
  if (stages) out.stages = stages

  const yearFrom = asInteger(config.yearFrom)
  if (yearFrom !== undefined) out.yearFrom = yearFrom
  const yearTo = asInteger(config.yearTo)
  if (yearTo !== undefined) out.yearTo = yearTo
  const topN = asInteger(config.topN)
  if (topN !== undefined && topN > 0) out.topN = topN

  if (typeof config.metric === "string" && (KPI_METRICS as readonly string[]).includes(config.metric)) {
    out.metric = config.metric as KpiMetric
  }
  return out
}
