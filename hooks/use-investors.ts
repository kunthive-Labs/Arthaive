"use client"
import { useState, useEffect, useCallback } from "react"

export function useInvestors(query = "") {
  const [investors, setInvestors] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams()
      if (q) qs.set("q", q)
      const res = await fetch(`/api/investors?${qs}`)
      if (!res.ok) throw new Error("fetch failed")
      const data = await res.json()
      setInvestors(data.investors ?? data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "error")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(query) }, [query])
  return { investors, loading, error, refetch: load }
}
