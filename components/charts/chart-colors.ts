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
