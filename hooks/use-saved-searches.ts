"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
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
  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    setSearches((data as SavedSearch[]) ?? [])
  }, [user, supabase])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (name: string, filters: Record<string, unknown>) => {
    if (!user) return
    const { data } = await supabase
      .from("saved_searches")
      .insert({ user_id: user.id, name, filters: filters as import("@/types/database.types").Json })
      .select()
      .single()
    if (data) setSearches((prev) => [data as SavedSearch, ...prev])
  }, [user, supabase])

  const remove = useCallback(async (id: string) => {
    await supabase.from("saved_searches").delete().eq("id", id)
    setSearches((prev) => prev.filter((s) => s.id !== id))
  }, [supabase])

  return { searches, save, remove }
}
