
export function normalizeChartData(data: Array<{ value: number; label: string }>): Array<{ value: number; label: string; pct: number }> {
  const total = data.reduce((s, d) => s + d.value, 0)
  return data.map(d => ({ ...d, pct: total ? (d.value / total) * 100 : 0 }))
}

export function limitChartItems<T extends { value: number }>(items: T[], max = 10, otherLabel = "Other"): Array<T | { label: string; value: number }> {
  if (items.length <= max) return items
  const top = items.slice(0, max - 1)
  const rest = items.slice(max - 1).reduce((s, i) => s + i.value, 0)
  return [...top, { label: otherLabel, value: rest } as T]
}

export function calcAxisBounds(values: number[], padding = 0.1): { min: number; max: number } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return { min: Math.max(0, min - range * padding), max: max + range * padding }
}

export function formatAxisLabel(value: number): string {
  if (value >= 1e7) return (value / 1e7).toFixed(0) + "Cr"
  if (value >= 1e5) return (value / 1e5).toFixed(0) + "L"
  if (value >= 1e3) return (value / 1e3).toFixed(0) + "K"
  return String(value)
}

export function buildBarData(items: Array<{ label: string; value: number }>, color = "#15803d"): object {
  return {
    labels: items.map(i => i.label),
    datasets: [{ data: items.map(i => i.value), backgroundColor: color, borderRadius: 4 }],
  }
}

export function buildLineData(series: Array<{ label: string; points: Array<{ x: string; y: number }> }>): object {
  return {
    datasets: series.map((s, idx) => ({
      label: s.label,
      data: s.points,
      tension: 0.3,
      fill: false,
    })),
  }
}

export function buildPieData(items: Array<{ label: string; value: number }>, colors: string[]): object {
  return {
    labels: items.map(i => i.label),
    datasets: [{ data: items.map(i => i.value), backgroundColor: colors.slice(0, items.length) }],
  }
}

export function calcMovingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function normalizeToPercent(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0)
  return total ? values.map(v => (v / total) * 100) : values.map(() => 0)
}

export function buildHeatmapData(cells: Array<{ x: string; y: string; value: number }>): { xLabels: string[]; yLabels: string[]; matrix: number[][] } {
  const xLabels = [...new Set(cells.map(c => c.x))]
  const yLabels = [...new Set(cells.map(c => c.y))]
  const matrix = yLabels.map(y => xLabels.map(x => cells.find(c => c.x === x && c.y === y)?.value ?? 0))
  return { xLabels, yLabels, matrix }
}

export function getChartColorByIndex(idx: number): string {
  const palette = ["#15803d","#1d4ed8","#7c3aed","#b45309","#dc2626","#0891b2","#db2777","#65a30d","#9333ea","#0d9488"]
  return palette[idx % palette.length]
}

export function buildStackedBarData(series: Array<{ label: string; data: number[]; color: string }>, xLabels: string[]): object {
  return {
    labels: xLabels,
    datasets: series.map(s => ({ label: s.label, data: s.data, backgroundColor: s.color, stack: "stack0" })),
  }
}

export function calcTrendLine(points: number[]): { slope: number; intercept: number } {
  const n = points.length
  const xs = points.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = points.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (points[i] - meanY), 0)
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0)
  const slope = den ? num / den : 0
  return { slope, intercept: meanY - slope * meanX }
}

export function buildDonutData(items: Array<{ label: string; value: number }>, colors: string[]): object {
  return {
    labels: items.map(i => i.label),
    datasets: [{ data: items.map(i => i.value), backgroundColor: colors, cutout: "65%" }],
  }
}

export function mergeChartSeries(base: number[], overlay: number[]): Array<{ base: number; overlay: number; diff: number }> {
  const len = Math.max(base.length, overlay.length)
  return Array.from({ length: len }, (_, i) => ({
    base: base[i] ?? 0,
    overlay: overlay[i] ?? 0,
    diff: (overlay[i] ?? 0) - (base[i] ?? 0),
  }))
}

export function buildAreaData(points: Array<{ x: string; y: number }>, color = "#15803d"): object {
  return {
    datasets: [{
      data: points,
      backgroundColor: color + "33",
      borderColor: color,
      fill: true,
      tension: 0.4,
    }],
  }
}

export function calcYAxisMax(values: number[], roundTo = 1000): number {
  const max = Math.max(...values, 0)
  return Math.ceil(max / roundTo) * roundTo
}

export function buildFunnelData(stages: string[], values: number[]): Array<{ stage: string; value: number; pct: number }> {
  const max = values[0] || 1
  return stages.map((stage, i) => ({ stage, value: values[i], pct: (values[i] / max) * 100 }))
}
