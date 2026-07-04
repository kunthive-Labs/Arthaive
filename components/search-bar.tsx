"use client"

import { useState, useMemo, useRef } from "react"
import { fundingData } from "@/data/funding-data"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = "site-search-results"

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return fundingData
      .filter(
        (d) =>
          d.company.toLowerCase().includes(q) ||
          d.sectors.some((s) => s.toLowerCase().includes(q)) ||
          d.investors.some((i) => i.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [query])

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
        if (activeIndex >= 0 && results[activeIndex]) {
          router.push(`/deal/${encodeURIComponent(results[activeIndex].id)}`)
          setQuery("")
          setIsOpen(false)
          setActiveIndex(-1)
        }
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
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${results[activeIndex]?.id}` : undefined}
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
          {results.map((deal, index) => (
            <Link
              key={deal.id}
              id={`${listboxId}-${deal.id}`}
              href={`/deal/${encodeURIComponent(deal.id)}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 text-sm transition-colors ${
                index === activeIndex
                  ? "bg-green-700 text-white"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setQuery("")
                setIsOpen(false)
                setActiveIndex(-1)
              }}
            >
              <div>
                <div className="font-bold">{deal.company}</div>
                <div className={`text-xs mt-0.5 ${index === activeIndex ? "text-green-100" : "text-gray-500"}`}>
                  {deal.sectors.slice(0, 2).join(" · ")} · {deal.stage}
                </div>
              </div>
              <div className={`text-sm font-bold ml-4 shrink-0 ${index === activeIndex ? "text-green-100" : "text-green-700"}`}>
                {deal.location}
              </div>
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
          <div className="text-sm font-semibold text-gray-500">No results for "{query}"</div>
          <div className="text-xs text-gray-400 mt-1">Try a company name, sector, or investor</div>
        </div>
      )}
    </div>
  )
}
