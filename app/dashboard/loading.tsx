export default function DashboardLoading() {
  return (
    <div className="container py-8">
      <div className="h-8 w-40 bg-muted animate-pulse rounded mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-lg border" />
        ))}
      </div>
    </div>
  )
}
