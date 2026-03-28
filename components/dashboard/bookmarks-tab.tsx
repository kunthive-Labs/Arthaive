"use client"

import { useBookmarks } from "@/hooks/use-bookmarks"
import Link from "next/link"
import { Bookmark } from "lucide-react"

export function BookmarksTab() {
  const { bookmarks } = useBookmarks()

  if (!bookmarks.length) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Bookmark className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No bookmarks yet. Bookmark deals to save them here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((dealId) => (
        <Link
          key={dealId}
          href={`/deal/${encodeURIComponent(dealId)}`}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
        >
          <span className="font-mono text-sm text-muted-foreground">{dealId}</span>
        </Link>
      ))}
    </div>
  )
}
