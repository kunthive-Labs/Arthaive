import type { ReactNode } from "react"
import {
  BarChart3, LineChart, PieChart, Activity, TrendingUp, Trophy, Table2,
  Network, Map as MapIcon, Grid3x3, CircleDot, Radar, Hash, Calendar, Layers,
} from "lucide-react"
import type { FundingDeal } from "@/data/funding-data"
import type { WidgetCategory, WidgetConfig } from "./types"

// Reused charts
import { FundingTrendLine } from "@/components/charts/funding-trend-line"
import { SectorBarChart } from "@/components/charts/sector-bar-chart"
import { StageFunnel } from "@/components/charts/stage-funnel"
import { BubbleChart } from "@/components/charts/bubble-chart"
import { FundingHeatmap } from "@/components/charts/funding-heatmap"
import { SankeyDiagram } from "@/components/charts/sankey-diagram"
import { IndiaMap } from "@/components/charts/india-map"
import { YoYComparison } from "@/components/charts/yoy-comparison"
import { DealVelocity } from "@/components/charts/deal-velocity"
import { SectorRadar } from "@/components/charts/sector-radar"
// New charts
import { KpiStatCard } from "@/components/charts/kpi-stat-card"
import { DealCountTrend } from "@/components/charts/deal-count-trend"
import { CityBarChart } from "@/components/charts/city-bar-chart"
import { StagePie } from "@/components/charts/stage-pie"
import { InvestorLeaderboard } from "@/components/charts/investor-leaderboard"
import { TopDealsTable } from "@/components/charts/top-deals-table"
import { RoundSizeHistogram } from "@/components/charts/round-size-histogram"
import { DealSizeTrend } from "@/components/charts/deal-size-trend"
import { SectorStageHeatmap } from "@/components/charts/sector-stage-heatmap"

export type FilterKey = "sectors" | "stages" | "years" | "topN" | "metric"

export interface WidgetDefinition {
  type: string
  label: string
  category: WidgetCategory
  description: string
  icon: typeof BarChart3
  defaultSize: { w: number; h: number } // grid units (12-col grid)
  minSize?: { w: number; h: number }
  filters: FilterKey[]
  render: (deals: FundingDeal[], config: WidgetConfig) => ReactNode
}

// A reasonable default set of sectors for widgets that chart "top sectors".
export const DEFAULT_SECTORS = [
  "Fintech", "Edtech", "Healthtech", "SaaS", "EV", "Logistics",
  "D2C", "Agritech", "Deeptech", "Gaming",
]

const DEFS: WidgetDefinition[] = [
  // ---- KPI stat cards ----
  {
    type: "kpi_capital",
    label: "Total Capital",
    category: "KPI",
    description: "Total disclosed capital tracked, with year-over-year change.",
    icon: TrendingUp,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    filters: ["metric", "sectors", "stages", "years"],
    render: (deals, c) => <KpiStatCard deals={deals} metric={c.metric ?? "total_capital"} title={c.title} />,
  },
  {
    type: "kpi_deals",
    label: "Deal Count",
    category: "KPI",
    description: "Number of deals, with year-over-year change.",
    icon: Hash,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    filters: ["metric", "sectors", "stages", "years"],
    render: (deals, c) => <KpiStatCard deals={deals} metric={c.metric ?? "deal_count"} title={c.title} />,
  },
  {
    type: "kpi_avg",
    label: "Average Round",
    category: "KPI",
    description: "Average disclosed round size.",
    icon: Activity,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    filters: ["metric", "sectors", "stages", "years"],
    render: (deals, c) => <KpiStatCard deals={deals} metric={c.metric ?? "avg_round"} title={c.title} />,
  },
  {
    type: "kpi_investors",
    label: "Active Investors",
    category: "KPI",
    description: "Count of unique investors.",
    icon: Trophy,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    filters: ["metric", "sectors", "stages", "years"],
    render: (deals, c) => <KpiStatCard deals={deals} metric={c.metric ?? "unique_investors"} title={c.title} />,
  },

  // ---- Time-series & breakdowns ----
  {
    type: "funding_trend",
    label: "Funding Over Time",
    category: "Time-series",
    description: "Monthly disclosed funding volume (area chart).",
    icon: LineChart,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "stages", "years"],
    render: (deals) => <FundingTrendLine deals={deals} />,
  },
  {
    type: "deal_count_trend",
    label: "Deal Count Over Time",
    category: "Time-series",
    description: "Monthly number of deals (line chart).",
    icon: LineChart,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "stages", "years"],
    render: (deals) => <DealCountTrend deals={deals} />,
  },
  {
    type: "sector_bar",
    label: "Top Sectors",
    category: "Time-series",
    description: "Sectors ranked by total funding.",
    icon: BarChart3,
    defaultSize: { w: 6, h: 9 },
    filters: ["sectors", "stages", "years", "topN"],
    render: (deals, c) => <SectorBarChart deals={deals} topN={c.topN ?? 12} />,
  },
  {
    type: "city_bar",
    label: "Top Cities",
    category: "Time-series",
    description: "Cities ranked by total funding.",
    icon: BarChart3,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "stages", "years", "topN"],
    render: (deals, c) => <CityBarChart deals={deals} topN={c.topN ?? 10} />,
  },
  {
    type: "stage_funnel",
    label: "Deal Count by Stage",
    category: "Time-series",
    description: "Deals grouped by funding stage (bar).",
    icon: BarChart3,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "years"],
    render: (deals) => <StageFunnel deals={deals} />,
  },
  {
    type: "stage_pie",
    label: "Stage Distribution",
    category: "Time-series",
    description: "Share of deals by stage (donut).",
    icon: PieChart,
    defaultSize: { w: 5, h: 8 },
    filters: ["sectors", "years"],
    render: (deals) => <StagePie deals={deals} />,
  },
  {
    type: "geography_map",
    label: "Geographic Map",
    category: "Time-series",
    description: "Funding distribution across India.",
    icon: MapIcon,
    defaultSize: { w: 7, h: 11 },
    filters: ["sectors", "stages", "years"],
    render: (deals) => <IndiaMap deals={deals} />,
  },

  // ---- Investor & leaderboards ----
  {
    type: "investor_leaderboard",
    label: "Top Investors",
    category: "Investors",
    description: "Most active investors by deal count and capital.",
    icon: Trophy,
    defaultSize: { w: 5, h: 9 },
    filters: ["sectors", "stages", "years", "topN"],
    render: (deals, c) => <InvestorLeaderboard deals={deals} topN={c.topN ?? 12} />,
  },
  {
    type: "top_deals",
    label: "Biggest Rounds",
    category: "Investors",
    description: "Largest disclosed rounds in the selection.",
    icon: Table2,
    defaultSize: { w: 5, h: 9 },
    filters: ["sectors", "stages", "years", "topN"],
    render: (deals, c) => <TopDealsTable deals={deals} topN={c.topN ?? 12} />,
  },
  {
    type: "money_flow",
    label: "Investor → Sector Flow",
    category: "Investors",
    description: "Sankey of capital from top investors into sectors.",
    icon: Network,
    defaultSize: { w: 8, h: 10 },
    filters: ["years"],
    render: (deals) => <SankeyDiagram deals={deals} topInvestors={10} topSectors={8} />,
  },

  // ---- Distributions & advanced ----
  {
    type: "round_histogram",
    label: "Round-Size Histogram",
    category: "Distributions",
    description: "Distribution of round sizes by ₹ Cr bucket.",
    icon: BarChart3,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "stages", "years"],
    render: (deals) => <RoundSizeHistogram deals={deals} />,
  },
  {
    type: "deal_size_trend",
    label: "Avg / Median Round Trend",
    category: "Distributions",
    description: "Average and median round size per year.",
    icon: LineChart,
    defaultSize: { w: 6, h: 8 },
    filters: ["sectors", "stages", "years"],
    render: (deals) => <DealSizeTrend deals={deals} />,
  },
  {
    type: "sector_stage_heatmap",
    label: "Sector × Stage Heatmap",
    category: "Distributions",
    description: "Deal-count matrix of sectors against stages.",
    icon: Grid3x3,
    defaultSize: { w: 7, h: 10 },
    filters: ["years"],
    render: (deals) => <SectorStageHeatmap deals={deals} topSectors={12} />,
  },
  {
    type: "funding_heatmap",
    label: "Sector × Time Heatmap",
    category: "Distributions",
    description: "Funding intensity by sector over time.",
    icon: Calendar,
    defaultSize: { w: 8, h: 10 },
    filters: ["stages", "years"],
    render: (deals) => <FundingHeatmap deals={deals} topSectors={12} />,
  },
  {
    type: "bubble",
    label: "Sector Bubble Chart",
    category: "Distributions",
    description: "Deal count vs avg size vs total funding by sector.",
    icon: CircleDot,
    defaultSize: { w: 8, h: 9 },
    filters: ["stages", "years"],
    render: (deals) => <BubbleChart deals={deals} />,
  },
  {
    type: "yoy",
    label: "Year-on-Year",
    category: "Distributions",
    description: "Monthly funding compared across years.",
    icon: Layers,
    defaultSize: { w: 8, h: 8 },
    filters: ["sectors", "stages"],
    render: (deals) => <YoYComparison deals={deals} />,
  },
  {
    type: "velocity",
    label: "Sector Velocity",
    category: "Distributions",
    description: "Rolling deal momentum across top sectors.",
    icon: Activity,
    defaultSize: { w: 8, h: 8 },
    filters: ["years"],
    render: (deals, c) => (
      <DealVelocity deals={deals} sectors={c.sectors?.length ? c.sectors : DEFAULT_SECTORS} />
    ),
  },
  {
    type: "sector_radar",
    label: "Sector Radar",
    category: "Distributions",
    description: "Multi-metric profile of top sectors.",
    icon: Radar,
    defaultSize: { w: 6, h: 8 },
    filters: ["years"],
    render: (deals, c) => (
      <SectorRadar deals={deals} sectors={c.sectors?.length ? c.sectors : DEFAULT_SECTORS} />
    ),
  },
]

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  DEFS.map((d) => [d.type, d])
)

export const WIDGET_LIST = DEFS

export const CATEGORY_ORDER: WidgetCategory[] = ["KPI", "Time-series", "Investors", "Distributions"]

export const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  KPI: "KPI Stat Cards",
  "Time-series": "Trends & Breakdowns",
  Investors: "Investors & Leaderboards",
  Distributions: "Distributions & Advanced",
}

export function getWidgetDef(type: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[type]
}
