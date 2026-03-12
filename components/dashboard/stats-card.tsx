interface StatsCardProps {
  label: string
  value: number | string
  sub?: string
}

export function StatsCard({ label, value, sub }: StatsCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}
