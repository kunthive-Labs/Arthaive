"use client"
import { useState, useCallback, useRef } from "react"
import type { SearchSuggestion } from "@/lib/types"
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(timer.current)
    if (!q.trim()) { setSuggestions([]); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      } finally { setLoading(false) }
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  return { query, suggestions, loading, search, clear: () => { setQuery(""); setSuggestions([]) } }
}
