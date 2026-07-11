// Types for the per-user customizable dashboard feature.

export type WidgetCategory = "KPI" | "Time-series" | "Investors" | "Distributions"

export type KpiMetric =
  | "total_capital"
  | "deal_count"
  | "avg_round"
  | "unique_investors"
  | "unique_sectors"
  | "unique_cities"
  | "largest_round"

// Per-instance widget settings. Every field is optional so an empty config
// means "use the whole dataset / sensible defaults".
export interface WidgetConfig {
  title?: string
  sectors?: string[]
  stages?: string[]
  yearFrom?: number
  yearTo?: number
  topN?: number
  metric?: KpiMetric
}

// One widget placed on a dashboard. `i` is the stable instance id and doubles
// as the react-grid-layout item key. `type` is a key into the widget registry.
export interface DashboardWidget {
  i: string
  type: string
  config: WidgetConfig
}

// A single react-grid-layout item.
export interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

// The responsive breakpoints we render (mirrors the builder's breakpoint map).
export type DashboardBreakpoint = "lg" | "md" | "sm" | "xs" | "xxs"

// Per-breakpoint layouts as reported by react-grid-layout's Responsive grid.
// Breakpoints the user never visited may be absent — RGL derives them from the
// closest defined breakpoint. Legacy rows stored a bare array (lg only); the
// data layer normalizes those to `{ lg: array }` on read.
export type DashboardLayouts = Partial<Record<DashboardBreakpoint, GridLayoutItem[]>>

export interface Dashboard {
  id: string
  user_id: string
  name: string
  layout: DashboardLayouts
  widgets: DashboardWidget[]
  is_default: boolean
  created_at: string
  updated_at: string
}
