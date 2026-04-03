"use client"

import { useSavedSearches } from "@/hooks/use-saved-searches"
import { Search, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { filtersToParams } from "@/lib/share"

export function SearchesTab() {
  const { searches, remove } = useSavedSearches()

  if (!searches.length) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No saved searches. Save filter combinations for quick access.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {searches.map((s) => {
        const params = filtersToParams(s.filters as Record<string, unknown>).toString()
        return (
          <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link href={`/explore${params ? `?${params}` : ""}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
