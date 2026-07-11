// Starter dashboard templates. Each template lists real widget registry type
// ids with an lg-breakpoint (12-column) position; instantiateTemplate() mints
// fresh instance ids and builds the widgets + layouts payload for creation.
// The other breakpoints are intentionally omitted — react-grid-layout derives
// them from lg until the user rearranges a smaller viewport.

import type { DashboardLayouts, DashboardWidget, GridLayoutItem, WidgetConfig } from "./types"
import { getWidgetDef } from "./widget-registry"

interface TemplateWidget {
  type: string // key into WIDGET_REGISTRY
  config?: WidgetConfig
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  widgets: TemplateWidget[]
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "market_overview",
    name: "Market Overview",
    description: "Headline KPIs, funding and deal-count trends, top sectors and the biggest rounds.",
    widgets: [
      { type: "kpi_capital", x: 0, y: 0, w: 3, h: 3 },
      { type: "kpi_deals", x: 3, y: 0, w: 3, h: 3 },
      { type: "kpi_avg", x: 6, y: 0, w: 3, h: 3 },
      { type: "kpi_investors", x: 9, y: 0, w: 3, h: 3 },
      { type: "funding_trend", x: 0, y: 3, w: 6, h: 8 },
      { type: "deal_count_trend", x: 6, y: 3, w: 6, h: 8 },
      { type: "sector_bar", config: { topN: 12 }, x: 0, y: 11, w: 6, h: 9 },
      { type: "stage_pie", x: 6, y: 11, w: 6, h: 9 },
      { type: "geography_map", x: 0, y: 20, w: 7, h: 11 },
      { type: "top_deals", config: { topN: 12 }, x: 7, y: 20, w: 5, h: 11 },
    ],
  },
  {
    id: "investor_intelligence",
    name: "Investor Intelligence",
    description: "Most active investors, where their capital flows, and the largest disclosed rounds.",
    widgets: [
      { type: "kpi_investors", x: 0, y: 0, w: 3, h: 3 },
      { type: "kpi_capital", x: 3, y: 0, w: 3, h: 3 },
      { type: "kpi_deals", x: 6, y: 0, w: 3, h: 3 },
      { type: "kpi_avg", x: 9, y: 0, w: 3, h: 3 },
      { type: "investor_leaderboard", config: { topN: 12 }, x: 0, y: 3, w: 6, h: 9 },
      { type: "top_deals", config: { topN: 12 }, x: 6, y: 3, w: 6, h: 9 },
      { type: "money_flow", x: 0, y: 12, w: 12, h: 10 },
      { type: "stage_funnel", x: 0, y: 22, w: 6, h: 8 },
      { type: "deal_size_trend", x: 6, y: 22, w: 6, h: 8 },
    ],
  },
  {
    id: "sector_deep_dive",
    name: "Sector Deep-Dive",
    description: "Sector rankings, stage mix, momentum over time and multi-metric sector profiles.",
    widgets: [
      { type: "sector_bar", config: { topN: 12 }, x: 0, y: 0, w: 6, h: 9 },
      { type: "sector_radar", x: 6, y: 0, w: 6, h: 9 },
      { type: "sector_stage_heatmap", x: 0, y: 9, w: 7, h: 10 },
      { type: "stage_funnel", x: 7, y: 9, w: 5, h: 10 },
      { type: "funding_heatmap", x: 0, y: 19, w: 12, h: 10 },
      { type: "bubble", x: 0, y: 29, w: 12, h: 9 },
    ],
  },
]

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `w-${Math.random().toString(36).slice(2)}`
}

// Materialize a template into the widgets + layouts payload for a new
// dashboard, minting a fresh instance id per widget.
export function instantiateTemplate(template: DashboardTemplate): {
  widgets: DashboardWidget[]
  layout: DashboardLayouts
} {
  const widgets: DashboardWidget[] = []
  const lg: GridLayoutItem[] = []
  for (const tw of template.widgets) {
    const def = getWidgetDef(tw.type)
    if (!def) continue
    const i = newId()
    widgets.push({ i, type: tw.type, config: tw.config ?? {} })
    lg.push({
      i,
      x: tw.x,
      y: tw.y,
      w: tw.w,
      h: tw.h,
      minW: def.minSize?.w ?? 2,
      minH: def.minSize?.h ?? 3,
    })
  }
  return { widgets, layout: { lg } }
}
