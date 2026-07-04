"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./use-auth"

export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("bookmarks")
      .select("deal_id")
      .eq("user_id", user.id)
    setBookmarks(data?.map((r) => r.deal_id) ?? [])
  }, [user, supabase])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (dealId: string) => {
    if (!user) return
    const isBookmarked = bookmarks.includes(dealId)
    if (isBookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("deal_id", dealId)
      setBookmarks((prev) => prev.filter((id) => id !== dealId))
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, deal_id: dealId })
      setBookmarks((prev) => [...prev, dealId])
    }
  }, [user, bookmarks, supabase])

  return { bookmarks, toggle, isBookmarked: (id: string) => bookmarks.includes(id) }
}
