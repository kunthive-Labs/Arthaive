// Brutalist chart identity: a green ramp (capital) interleaved with the
// signal accent, ink, and a couple of neutrals — distinguishable adjacent
// slices without leaving the green/signal/ink world.
export const CHART_COLORS = [
  "#1A5D1A", // green
  "#FF5A1F", // signal
  "#0C3A12", // deep green
  "#4ABD4A", // mid green
  "#0B0B0B", // ink
  "#FFB100", // amber
  "#7AED7A", // light green
  "#D9410D", // deep signal
  "#1F8A3B", // bright green
  "#9CA38F", // sage grey
]

export const CHART_COLORS_MUTED = CHART_COLORS.map((c) => `${c}80`)

// Stage → green ramp by maturity; outliers in signal / ink.
export const STAGE_COLORS: Record<string, string> = {
  "Pre-Seed": "#7AED7A",
  "Seed": "#4ABD4A",
  "Series A": "#1F8A3B",
  "Series B": "#1A5D1A",
  "Series C": "#155215",
  "Series D": "#0C3A12",
  "Debt": "#9CA38F",
  "Growth": "#FF5A1F",
  "IPO": "#0B0B0B",
}

export function colorForIndex(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length]
}


export const CHART_GRID_COLOR = "#E5E3DA"
export const CHART_AXIS_COLOR = "#0B0B0B"


export const CHART_COLORS_CATEGORICAL = CHART_COLORS


// Hard-edged brutalist tooltip: white card, thick ink border, no radius.
export const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "3px solid #0B0B0B",
  borderRadius: "0px",
  fontSize: 12,
  fontWeight: 600,
  boxShadow: "4px 4px 0 #0B0B0B",
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


export const Z_INDEX = {
  tooltip: 50,
  modal: 100,
  toast: 150,
  dropdown: 200,
} as const


export const FOCUS_RING_CLASS = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"


export function getChartTheme(isDark: boolean) {
  return {
    background: isDark ? "hsl(222 47% 11%)" : "#ffffff",
    text: isDark ? "#e2e8f0" : "#1e293b",
    grid: isDark ? "hsl(215 28% 20%)" : "hsl(214 32% 91%)",
    primary: "hsl(var(--primary))",
  }
}


export const PRINT_SAFE_COLORS = [
  "#000000","#333333","#555555","#777777","#999999","#bbbbbb",
]
