"use client"
import { useState, useEffect, useCallback } from "react"
import type { DealFilters } from "@/lib/types"

export function useDeals(initial: DealFilters = {}) {
  const [deals, setDeals] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const load = useCallback(async (filters: DealFilters) => {
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams()
      if (filters.sector?.length) qs.set("sector", filters.sector.join(","))
      if (filters.stage?.length) qs.set("stage", filters.stage.join(","))
      if (filters.location) qs.set("location", filters.location)
      if (filters.search) qs.set("q", filters.search)
      if (filters.page) qs.set("page", String(filters.page))
      const res = await fetch(`/api/deals?${qs}`)
      if (!res.ok) throw new Error("fetch failed")
      const data = await res.json()
      setDeals(data.deals); setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "error")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(initial) }, [])
  return { deals, loading, error, total, refetch: load }
}
