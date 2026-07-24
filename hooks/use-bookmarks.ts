"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./use-auth"

export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const load = useCallback(async () => {
    if (!user) return
    const response = await fetch("/api/bookmarks")
    if (!response.ok) return
    const data = (await response.json()) as Array<{ deal_id: string }>
    setBookmarks(data.map((row) => row.deal_id))
  }, [user])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (dealId: string) => {
    if (!user) return
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId }),
    })
    if (!response.ok) return
    setBookmarks((prev) =>
      prev.includes(dealId)
        ? prev.filter((id) => id !== dealId)
        : [...prev, dealId]
    )
  }, [user])

  return { bookmarks, toggle, isBookmarked: (id: string) => bookmarks.includes(id) }
}
