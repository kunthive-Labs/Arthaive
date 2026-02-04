
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
