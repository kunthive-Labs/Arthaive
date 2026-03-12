export default function ProfileLoading() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
      <div className="space-y-6">
        <div className="rounded-lg border p-6 h-40 bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 h-20 bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
