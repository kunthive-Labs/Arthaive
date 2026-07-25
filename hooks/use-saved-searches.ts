"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./use-auth"

interface SavedSearch {
  id: string
  name: string
  filters: Record<string, unknown>
  created_at: string
}

export function useSavedSearches() {
  const { user } = useAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const load = useCallback(async () => {
    if (!user) return
    const response = await fetch("/api/saved-searches")
    if (!response.ok) return
    setSearches((await response.json()) as SavedSearch[])
  }, [user])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (name: string, filters: Record<string, unknown>) => {
    if (!user) return
    const response = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, filters }),
    })
    if (response.ok) await load()
  }, [user, load])

  const remove = useCallback(async (id: string) => {
    const response = await fetch("/api/saved-searches", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) return
    setSearches((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return { searches, save, remove }
}
