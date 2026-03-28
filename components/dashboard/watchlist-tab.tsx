"use client"

import { useWatchlist } from "@/hooks/use-watchlist"
import { Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WatchlistTab() {
  const { watchlist, toggle } = useWatchlist()

  if (!watchlist.length) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Star className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No companies watched. Add companies from deal pages.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {watchlist.map((company) => (
        <div key={company} className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium text-sm">{company}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggle(company)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
