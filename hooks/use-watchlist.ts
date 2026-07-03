"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./use-auth"

export function useWatchlist() {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("watchlist")
      .select("company")
      .eq("user_id", user.id)
    setWatchlist(data?.map((r) => r.company) ?? [])
  }, [user, supabase])

  useEffect(() => {
    void load()
  }, [load])

  const add = useCallback(async (company: string) => {
    if (!user) return
    await supabase.from("watchlist").insert({ user_id: user.id, company })
    setWatchlist((prev) => [...prev, company])
  }, [user, supabase])

  const remove = useCallback(async (company: string) => {
    if (!user) return
    await supabase.from("watchlist").delete().eq("user_id", user.id).eq("company", company)
    setWatchlist((prev) => prev.filter((c) => c !== company))
  }, [user, supabase])

  const toggle = useCallback((company: string) => {
    if (watchlist.includes(company)) {
      remove(company)
    } else {
      add(company)
    }
  }, [watchlist, add, remove])

  return { watchlist, toggle, isWatching: (c: string) => watchlist.includes(c) }
}
