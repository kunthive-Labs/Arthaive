import { Suspense } from "react"
import { LiveDealFeed } from "@/components/live-deal-feed"

export const metadata = {
  title: "Live Feed | India Startup Funding",
  description: "Real-time stream of Indian startup funding deals",
}

export default function LivePage() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <div className="h-3 w-3 rounded-full bg-green-500 animate-ping absolute inset-0" />
        </div>
        <h1 className="text-2xl font-bold">Live Deal Feed</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Real-time updates as new funding deals are added to the database.
      </p>
      <Suspense fallback={
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      }>
        <LiveDealFeed />
      </Suspense>
    </div>
  )
}
