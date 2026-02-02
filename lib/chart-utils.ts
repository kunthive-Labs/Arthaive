
export function normalizeChartData(data: Array<{ value: number; label: string }>): Array<{ value: number; label: string; pct: number }> {
  const total = data.reduce((s, d) => s + d.value, 0)
  return data.map(d => ({ ...d, pct: total ? (d.value / total) * 100 : 0 }))
}
