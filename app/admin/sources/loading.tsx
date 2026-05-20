export default function Loading() {
  return (
    <div className="container py-8">
      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
