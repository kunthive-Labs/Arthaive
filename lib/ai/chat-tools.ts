/**
 * Tool definitions + server-side executor for the BYOK chat assistant.
 *
 * Two data tools (`query_deals`, `aggregate_deals`) are executed here against
 * `lib/db/deals.getDeals`, so answers are grounded in the real dataset whether
 * it comes from Supabase or the static fallback. The third tool
 * (`suggest_widget`) is NOT executed server-side — the chat route validates
 * its args with `suggestWidgetSchema` and forwards a `widget_suggestion` SSE
 * event to the client.
 *
 * Amounts: `Deal.amount` is stored in ₹ lakh (100 lakh = 1 Cr). Everything
 * returned to the model is converted to millions of USD at the dataset's flat
 * rate so the model reasons in a single unit.
 */

import { z } from "zod"
import { getDeals } from "@/lib/db/deals"
import { DATA_USD_RATE } from "@/lib/supabase/config"
import type { Deal, DealFilters } from "@/lib/types"
import type { GroqToolDefinition } from "./groq"

// ---------------------------------------------------------------------------
// Widget catalogue — keep in sync with lib/dashboard/widget-registry.tsx.
// (The registry is a .tsx module that imports every chart component, so the
// server-only chat layer mirrors the ids/sizes instead of importing it.)
// ---------------------------------------------------------------------------

export const CHAT_WIDGETS = [
  { type: "kpi_capital", label: "Total Capital KPI card", defaultSize: { w: 3, h: 3 } },
  { type: "kpi_deals", label: "Deal Count KPI card", defaultSize: { w: 3, h: 3 } },
  { type: "kpi_avg", label: "Average Round KPI card", defaultSize: { w: 3, h: 3 } },
  { type: "kpi_investors", label: "Active Investors KPI card", defaultSize: { w: 3, h: 3 } },
  { type: "funding_trend", label: "Funding over time (area)", defaultSize: { w: 6, h: 8 } },
  { type: "deal_count_trend", label: "Deal count over time (line)", defaultSize: { w: 6, h: 8 } },
  { type: "sector_bar", label: "Top sectors by funding (bar)", defaultSize: { w: 6, h: 9 } },
  { type: "city_bar", label: "Top cities by funding (bar)", defaultSize: { w: 6, h: 8 } },
  { type: "stage_funnel", label: "Deal count by stage (bar)", defaultSize: { w: 6, h: 8 } },
  { type: "stage_pie", label: "Stage distribution (donut)", defaultSize: { w: 5, h: 8 } },
  { type: "geography_map", label: "Geographic map of India", defaultSize: { w: 7, h: 11 } },
  { type: "investor_leaderboard", label: "Top investors leaderboard", defaultSize: { w: 5, h: 9 } },
  { type: "top_deals", label: "Biggest rounds table", defaultSize: { w: 5, h: 9 } },
  { type: "money_flow", label: "Investor → sector Sankey", defaultSize: { w: 8, h: 10 } },
  { type: "round_histogram", label: "Round-size histogram", defaultSize: { w: 6, h: 8 } },
  { type: "deal_size_trend", label: "Avg/median round trend", defaultSize: { w: 6, h: 8 } },
  { type: "sector_stage_heatmap", label: "Sector × stage heatmap", defaultSize: { w: 7, h: 10 } },
  { type: "funding_heatmap", label: "Sector × time heatmap", defaultSize: { w: 8, h: 10 } },
  { type: "bubble", label: "Sector bubble chart", defaultSize: { w: 8, h: 9 } },
  { type: "yoy", label: "Year-on-year monthly comparison", defaultSize: { w: 8, h: 8 } },
  { type: "velocity", label: "Sector velocity (rolling momentum)", defaultSize: { w: 8, h: 8 } },
  { type: "sector_radar", label: "Sector radar (multi-metric)", defaultSize: { w: 6, h: 8 } },
] as const

export type ChatWidgetType = (typeof CHAT_WIDGETS)[number]["type"]

const WIDGET_TYPE_IDS = CHAT_WIDGETS.map((w) => w.type) as [ChatWidgetType, ...ChatWidgetType[]]

const DEFAULT_WIDGET_SIZE = { w: 6, h: 8 }

export function widgetDefaultSize(type: string): { w: number; h: number } {
  return CHAT_WIDGETS.find((w) => w.type === type)?.defaultSize ?? DEFAULT_WIDGET_SIZE
}

// Matches KpiMetric in lib/dashboard/types.ts.
const KPI_METRICS = [
  "total_capital",
  "deal_count",
  "avg_round",
  "unique_investors",
  "unique_sectors",
  "unique_cities",
  "largest_round",
] as const

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** ₹ lakh → millions of USD at the dataset's flat rate. Null = undisclosed. */
export function lakhsToUsdMillions(amountLakhs: number): number | null {
  if (!amountLakhs || amountLakhs <= 0 || !Number.isFinite(amountLakhs)) return null
  return round2((amountLakhs * 100_000) / DATA_USD_RATE / 1_000_000)
}

// ---------------------------------------------------------------------------
// Argument schemas
// ---------------------------------------------------------------------------

const yearBoundSchema = z.coerce.number().int().min(1990).max(2100)

const sharedFilterFields = {
  sectors: z.array(z.string().min(1).max(80)).max(20).optional(),
  stages: z.array(z.string().min(1).max(80)).max(20).optional(),
  yearFrom: yearBoundSchema.optional(),
  yearTo: yearBoundSchema.optional(),
  company: z.string().max(200).optional(),
}

const queryDealsSchema = z.object({
  ...sharedFilterFields,
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sortBy: z.enum(["amount", "date"]).optional(),
})

const aggregateDealsSchema = z.object({
  ...sharedFilterFields,
  groupBy: z.enum(["sector", "stage", "year", "investor", "location"]),
  metric: z.enum(["count", "total_usd", "avg_usd"]).optional(),
  topN: z.coerce.number().int().min(1).max(25).optional(),
})

export const suggestWidgetSchema = z.object({
  type: z.enum(WIDGET_TYPE_IDS),
  title: z.string().trim().min(1).max(120),
  config: z
    .object({
      sectors: z.array(z.string().min(1).max(80)).max(20).optional(),
      stages: z.array(z.string().min(1).max(80)).max(20).optional(),
      yearFrom: yearBoundSchema.optional(),
      yearTo: yearBoundSchema.optional(),
      topN: z.coerce.number().int().min(1).max(50).optional(),
      metric: z.enum(KPI_METRICS).optional(),
    })
    .optional(),
})

export type SuggestedWidget = z.infer<typeof suggestWidgetSchema>

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling format, accepted by Groq)
// ---------------------------------------------------------------------------

const FILTER_PROPERTIES = {
  sectors: {
    type: "array",
    items: { type: "string" },
    description: "Only include deals matching ANY of these sectors, e.g. ['Fintech', 'Edtech'].",
  },
  stages: {
    type: "array",
    items: { type: "string" },
    description:
      "Only include deals at ANY of these stages, e.g. ['Seed', 'Series A', 'Series B'].",
  },
  yearFrom: { type: "integer", description: "Earliest deal year to include (e.g. 2021)." },
  yearTo: { type: "integer", description: "Latest deal year to include (e.g. 2024)." },
  company: {
    type: "string",
    description: "Case-insensitive substring match on the company name.",
  },
} as const

export const CHAT_TOOL_DEFINITIONS: GroqToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_deals",
      description:
        "Fetch individual startup funding deals matching the given filters. Returns up to 50 rows " +
        "with company, amountUSD (millions of USD; null = undisclosed), stage, sectors, date, " +
        "leadInvestor and location, plus the total match count. Use for questions about specific " +
        "companies or lists of deals.",
      parameters: {
        type: "object",
        properties: {
          ...FILTER_PROPERTIES,
          limit: {
            type: "integer",
            description: "Max rows to return (1-50, default 20).",
          },
          sortBy: {
            type: "string",
            enum: ["amount", "date"],
            description: "Sort by round size or recency (default 'date').",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aggregate_deals",
      description:
        "Aggregate all deals matching the given filters into groups and return the top groups " +
        "sorted by the chosen metric. Amounts are in millions of USD. A deal with multiple " +
        "sectors/investors counts once in EACH of its groups. Use for totals, rankings, trends " +
        "and any numeric/analytical question.",
      parameters: {
        type: "object",
        properties: {
          ...FILTER_PROPERTIES,
          groupBy: {
            type: "string",
            enum: ["sector", "stage", "year", "investor", "location"],
            description: "Dimension to group deals by.",
          },
          metric: {
            type: "string",
            enum: ["count", "total_usd", "avg_usd"],
            description:
              "Metric to rank groups by: deal count, total disclosed USD (millions), or average " +
              "disclosed round size in USD millions (default 'count').",
          },
          topN: { type: "integer", description: "Number of top groups to return (1-25, default 10)." },
        },
        required: ["groupBy"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_widget",
      description:
        "Suggest a dashboard widget the user can add with one click. Use when the user asks to " +
        "visualize, chart, plot or track something. Available widget types: " +
        CHAT_WIDGETS.map((w) => `${w.type} (${w.label})`).join(", ") +
        ".",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [...WIDGET_TYPE_IDS],
            description: "Widget type id from the catalogue.",
          },
          title: { type: "string", description: "Short human-readable widget title." },
          config: {
            type: "object",
            description: "Optional data filters applied to the widget.",
            properties: {
              sectors: { type: "array", items: { type: "string" } },
              stages: { type: "array", items: { type: "string" } },
              yearFrom: { type: "integer" },
              yearTo: { type: "integer" },
              topN: { type: "integer" },
              metric: {
                type: "string",
                enum: [...KPI_METRICS],
                description: "Only used by KPI stat-card widgets.",
              },
            },
            additionalProperties: false,
          },
        },
        required: ["type", "title"],
        additionalProperties: false,
      },
    },
  },
]

export const DATA_TOOL_NAMES = ["query_deals", "aggregate_deals"] as const
export type DataToolName = (typeof DATA_TOOL_NAMES)[number]

export function isDataToolName(name: string): name is DataToolName {
  return (DATA_TOOL_NAMES as readonly string[]).includes(name)
}

// ---------------------------------------------------------------------------
// Filter mapping
// ---------------------------------------------------------------------------

interface SharedFilterArgs {
  sectors?: string[]
  stages?: string[]
  yearFrom?: number
  yearTo?: number
  company?: string
}

// getDeals takes discrete year strings, so expand the [from, to] range.
function yearsBetween(yearFrom?: number, yearTo?: number): string[] {
  if (yearFrom === undefined && yearTo === undefined) return []
  const currentYear = new Date().getFullYear()
  let start = yearFrom ?? 2015
  let end = yearTo ?? currentYear
  if (start > end) [start, end] = [end, start]
  // The dataset spans 2015→present; clamp so a wild range can't explode.
  start = Math.max(start, 1990)
  end = Math.min(end, currentYear + 1)
  if (start > end) return []
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i))
}

function toDealFilters(args: SharedFilterArgs): DealFilters {
  const filters: DealFilters = {}
  if (args.company) filters.search = args.company
  if (args.sectors?.length) filters.sectors = args.sectors
  if (args.stages?.length) filters.stages = args.stages
  const years = yearsBetween(args.yearFrom, args.yearTo)
  if (years.length) filters.years = years
  return filters
}

// ---------------------------------------------------------------------------
// Aggregation (pure — unit-tested against inline fixtures)
// ---------------------------------------------------------------------------

export type AggregateGroupBy = "sector" | "stage" | "year" | "investor" | "location"
export type AggregateMetric = "count" | "total_usd" | "avg_usd"

export interface AggregateGroup {
  group: string
  count: number
  totalUsdM: number
  avgUsdM: number | null
}

// Only the fields aggregation reads, so tests can use small fixtures.
export type AggregatableDeal = Pick<
  Deal,
  "amount" | "stage" | "sectors" | "investors" | "location" | "date"
>

function groupKeysFor(deal: AggregatableDeal, groupBy: AggregateGroupBy): string[] {
  switch (groupBy) {
    case "sector":
      return deal.sectors ?? []
    case "investor":
      return deal.investors ?? []
    case "stage":
      return deal.stage ? [deal.stage] : []
    case "location":
      return deal.location ? [deal.location] : []
    case "year": {
      const year = deal.date?.slice(0, 4)
      return year && /^\d{4}$/.test(year) ? [year] : []
    }
  }
}

/**
 * Group deals and rank by the chosen metric. A deal belonging to several
 * groups (multiple sectors/investors) counts once in EACH group, but never
 * twice in the same group. `avgUsdM` averages disclosed rounds only.
 */
export function aggregateDeals(
  deals: AggregatableDeal[],
  groupBy: AggregateGroupBy,
  metric: AggregateMetric,
  topN: number,
): AggregateGroup[] {
  const groups = new Map<string, { count: number; totalUsdM: number; disclosed: number }>()

  for (const deal of deals) {
    const usdM = lakhsToUsdMillions(deal.amount)
    // De-dupe so a deal listing the same sector/investor twice counts once.
    for (const key of new Set(groupKeysFor(deal, groupBy).filter(Boolean))) {
      let entry = groups.get(key)
      if (!entry) {
        entry = { count: 0, totalUsdM: 0, disclosed: 0 }
        groups.set(key, entry)
      }
      entry.count++
      if (usdM !== null) {
        entry.totalUsdM += usdM
        entry.disclosed++
      }
    }
  }

  const rows: AggregateGroup[] = [...groups.entries()].map(([group, g]) => ({
    group,
    count: g.count,
    totalUsdM: round2(g.totalUsdM),
    avgUsdM: g.disclosed ? round2(g.totalUsdM / g.disclosed) : null,
  }))

  rows.sort((a, b) => {
    if (metric === "count") return b.count - a.count
    if (metric === "total_usd") return b.totalUsdM - a.totalUsdM
    return (b.avgUsdM ?? 0) - (a.avgUsdM ?? 0)
  })

  return rows.slice(0, topN)
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

const QUERY_DEFAULT_LIMIT = 20
const AGGREGATE_DEFAULT_TOP_N = 10
// getDeals caps a page at 100 rows, so aggregation pages through matches.
const AGGREGATE_PAGE_LIMIT = 100
// Hard ceiling on how many deals one aggregation will pull (covers the full
// static dataset; prevents unbounded paging against Supabase).
const AGGREGATE_MAX_DEALS = 20_000

export interface ToolResult {
  /** JSON string fed back to the model as the tool result. */
  content: string
  /** Short human-readable summary for the `tool_result` SSE event. */
  summary: string
}

async function fetchAllMatchingDeals(filters: DealFilters): Promise<{ deals: Deal[]; total: number }> {
  const all: Deal[] = []
  let total = 0
  for (let page = 1; ; page++) {
    const res = await getDeals({ ...filters, sortBy: "date", page, limit: AGGREGATE_PAGE_LIMIT })
    all.push(...res.deals)
    total = res.total
    if (page >= res.totalPages || res.deals.length === 0 || all.length >= AGGREGATE_MAX_DEALS) break
  }
  return { deals: all, total }
}

async function runQueryDeals(args: unknown): Promise<ToolResult> {
  const parsed = queryDealsSchema.parse(args)
  const limit = parsed.limit ?? QUERY_DEFAULT_LIMIT
  const sortBy = parsed.sortBy ?? "date"

  const { deals, total } = await getDeals({
    ...toDealFilters(parsed),
    sortBy,
    page: 1,
    limit,
  })

  const rows = deals.map((d) => ({
    company: d.company,
    amountUSD: lakhsToUsdMillions(d.amount),
    stage: d.stage,
    sectors: d.sectors,
    date: d.date,
    leadInvestor: d.leadInvestor,
    location: d.location,
  }))

  return {
    content: JSON.stringify({
      note: "amountUSD is in millions of USD; null means undisclosed.",
      totalMatches: total,
      returned: rows.length,
      deals: rows,
    }),
    summary: `Found ${total} matching deal${total === 1 ? "" : "s"}; returned ${rows.length} sorted by ${sortBy}.`,
  }
}

async function runAggregateDeals(args: unknown): Promise<ToolResult> {
  const parsed = aggregateDealsSchema.parse(args)
  const metric = parsed.metric ?? "count"
  const topN = parsed.topN ?? AGGREGATE_DEFAULT_TOP_N

  const { deals, total } = await fetchAllMatchingDeals(toDealFilters(parsed))
  const groups = aggregateDeals(deals, parsed.groupBy, metric, topN)

  return {
    content: JSON.stringify({
      note: "totalUsdM/avgUsdM are in millions of USD (disclosed rounds only).",
      dealsMatched: total,
      groupBy: parsed.groupBy,
      metric,
      groups,
    }),
    summary: `Aggregated ${total} deal${total === 1 ? "" : "s"} into top ${groups.length} ${parsed.groupBy} group${groups.length === 1 ? "" : "s"} by ${metric}.`,
  }
}

/**
 * Execute one of the server-side data tools. Invalid model-supplied arguments
 * are returned as a readable tool result (so the model can correct itself)
 * rather than thrown; unknown tool names throw.
 */
export async function executeTool(name: string, args: unknown): Promise<ToolResult> {
  if (!isDataToolName(name)) {
    throw new Error(`Unknown chat tool: ${name}`)
  }
  try {
    return name === "query_deals" ? await runQueryDeals(args) : await runAggregateDeals(args)
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")
      return {
        content: JSON.stringify({ error: `Invalid arguments for ${name}: ${issues}` }),
        summary: `Rejected ${name} call (invalid arguments).`,
      }
    }
    throw err
  }
}
