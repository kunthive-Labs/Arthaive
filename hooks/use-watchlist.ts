"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./use-auth"

export function useWatchlist() {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const load = useCallback(async () => {
    if (!user) return
    const response = await fetch("/api/watchlist")
    if (!response.ok) return
    const data = (await response.json()) as Array<{ company: string }>
    setWatchlist(data.map((row) => row.company))
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const add = useCallback(async (company: string) => {
    if (!user) return
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company }),
    })
    if (!response.ok) return
    setWatchlist((prev) => [...prev, company])
  }, [user])

  const remove = useCallback(async (company: string) => {
    if (!user) return
    const response = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company }),
    })
    if (!response.ok) return
    setWatchlist((prev) => prev.filter((c) => c !== company))
  }, [user])

  const toggle = useCallback((company: string) => {
    if (watchlist.includes(company)) {
      remove(company)
    } else {
      add(company)
    }
  }, [watchlist, add, remove])

  return { watchlist, toggle, isWatching: (c: string) => watchlist.includes(c) }
}
