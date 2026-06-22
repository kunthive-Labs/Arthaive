"use client"

import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

export function BookmarkButton({ dealId }: { dealId: string }) {
  const { user } = useAuth()
  const { isBookmarked, toggle } = useBookmarks()
  const saved = isBookmarked(dealId)

  if (!user) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggle(dealId)}
      className={cn("h-8 w-8", saved && "text-primary")}
      aria-label={saved ? "Remove bookmark" : "Add bookmark"}
      aria-pressed={saved}
      title={saved ? "Remove bookmark" : "Bookmark deal"}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
    </Button>
  )
}
