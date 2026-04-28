export const CHART_COLORS = [
  "hsl(var(--primary))", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#f97316", "#84cc16", "#3b82f6", "#ec4899",
  "#14b8a6", "#a855f7", "#eab308", "#22c55e", "#6366f1",
]

export const CHART_COLORS_MUTED = CHART_COLORS.map((c) => `${c}80`)

export const STAGE_COLORS: Record<string, string> = {
  "Seed": "#6366f1",
  "Pre-Seed": "#8b5cf6",
  "Series A": "#3b82f6",
  "Series B": "#06b6d4",
  "Series C": "#10b981",
  "Series D": "#84cc16",
  "Debt": "#64748b",
  "Growth": "#f59e0b",
  "IPO": "#ef4444",
}

export function colorForIndex(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length]
}


export const CHART_GRID_COLOR = "hsl(var(--muted))"
export const CHART_AXIS_COLOR = "hsl(var(--muted-foreground))"


export const CHART_COLORS_CATEGORICAL = [
  "#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#f97316","#14b8a6","#84cc16","#ec4899",
]


export const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: 12,
}


export const CHART_ANIMATION_MS = 400
export const CHART_ANIMATION_EASING = "ease-out"


export function stageColor(stage: string): string {
  return (STAGE_COLORS[stage] as string | undefined) ?? CHART_COLORS[0]
}


export interface GradientDef {
  id: string
  color: string
  opacity?: number
}

export function chartGradientDefs(color: string, id = "primary"): GradientDef {
  return { id, color, opacity: 0.3 }
}


export function interpolateColor(value: number, min = 0, max = 100): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const h = Math.round(220 - ratio * 160)
  return `hsl(${h} 80% 50%)`
}


export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}


export function niceChartDomain(
  values: number[],
  paddingFactor = 0.1
): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * paddingFactor
  return [Math.max(0, min - pad), max + pad]
}


export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}


export const CHART_HEIGHT_SM = 200
export const CHART_HEIGHT_MD = 288
export const CHART_HEIGHT_LG = 400
export const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 0 }
