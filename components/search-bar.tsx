"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SEARCH_DEBOUNCE_MS } from "@/lib/supabase/config"

interface SearchSuggestion {
  type: string
  label: string
  value: string
  sublabel?: string
  location?: string
}

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = "site-search-results"

  // Debounced, abortable fetch against the public /api/search endpoint. This used
  // to filter the 7.9MB `fundingData` in the browser — importing it here shipped
  // the whole dataset in the header bundle on every page. Now the data stays on
  // the server and only matched rows come over the wire.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        setResults(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 8) : [])
        setActiveIndex(-1)
      } catch {
        // Aborted (superseded keystroke) or a transient network error — keep the
        // last results in place rather than flashing an error on every keypress.
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const go = (value: string) => {
    router.push(`/deal/${encodeURIComponent(value)}`)
    setQuery("")
    setResults([])
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") setIsOpen(false)
      return
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) go(results[activeIndex].value)
        break
      case "Escape":
        setIsOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search companies, sectors, investors…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => { setIsOpen(false); setActiveIndex(-1) }, 150)}
          onKeyDown={handleKeyDown}
          className="w-full neo-border px-4 py-3 font-semibold text-sm focus:outline-none bg-white pr-32"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen && results.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${results[activeIndex]?.value}` : undefined}
          role="combobox"
        />
        {query && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono hidden md:block">
            ↑↓ navigate · ↵ open · esc close
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          id={listboxId}
          className="absolute top-full left-0 right-0 neo-border border-t-0 bg-white z-50 shadow-lg"
          role="listbox"
        >
          {results.map((result, index) => (
            <Link
              key={result.value}
              id={`${listboxId}-${result.value}`}
              href={`/deal/${encodeURIComponent(result.value)}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 text-sm transition-colors ${
                index === activeIndex
                  ? "bg-green-700 text-white"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setQuery("")
                setResults([])
                setIsOpen(false)
                setActiveIndex(-1)
              }}
            >
              <div>
                <div className="font-bold">{result.label}</div>
                {result.sublabel && (
                  <div className={`text-xs mt-0.5 ${index === activeIndex ? "text-green-100" : "text-gray-500"}`}>
                    {result.sublabel}
                  </div>
                )}
              </div>
              {result.location && (
                <div className={`text-sm font-bold ml-4 shrink-0 ${index === activeIndex ? "text-green-100" : "text-green-700"}`}>
                  {result.location}
                </div>
              )}
            </Link>
          ))}
          <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-3 bg-gray-50">
            <span><kbd className="font-mono bg-white border border-gray-300 px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-white border border-gray-300 px-1 rounded">↵</kbd> open</span>
            <span><kbd className="font-mono bg-white border border-gray-300 px-1 rounded">Esc</kbd> close</span>
            <span className="ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 neo-border border-t-0 bg-white z-50 px-4 py-6 text-center">
          <div className="text-sm font-semibold text-gray-500">No results for &quot;{query}&quot;</div>
          <div className="text-xs text-gray-400 mt-1">Try a company name, sector, or investor</div>
        </div>
      )}
    </div>
  )
}
