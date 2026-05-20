"use client"
import { useState, useEffect, useCallback } from "react"
import type { Deal, DealFilters } from "@/lib/types"

export function useDeals(initial: DealFilters = {}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async (filters: DealFilters) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()

      if (filters.search)                   qs.set("search", filters.search)
      if (filters.investorSearch)           qs.set("investor", filters.investorSearch)
      if (filters.location)                 qs.set("location", filters.location)
      if (filters.sortBy)                   qs.set("sort", filters.sortBy)
      if (filters.page)                     qs.set("page", String(filters.page))
      if (filters.limit)                    qs.set("limit", String(filters.limit))
      if (filters.minAmount && filters.minAmount > 0) qs.set("minAmount", String(filters.minAmount))
      if (filters.maxAmount && filters.maxAmount < Infinity) qs.set("maxAmount", String(filters.maxAmount))
      if (filters.showUndisclosed === false) qs.set("undisclosed", "false")

      filters.sectors?.forEach((s) => qs.append("sector", s))
      filters.stages?.forEach((s)  => qs.append("stage", s))
      filters.years?.forEach((y)   => qs.append("year", y))

      const res = await fetch(`/api/deals?${qs}`)
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
      const data = await res.json()

      setDeals(data.deals ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deals")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { deals, loading, error, total, totalPages, refetch: load }
}
