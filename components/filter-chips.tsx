"use client"

import { X } from "lucide-react"
import type { FilterState } from "@/hooks/use-filter-state"

interface FilterChipsProps {
  filters: FilterState
  onRemove: (key: keyof FilterState, value?: string) => void
  onClear: () => void
}

export function FilterChips({ filters, onRemove, onClear }: FilterChipsProps) {
  const chips: { label: string; key: keyof FilterState; value?: string }[] = []

  if (filters.search) chips.push({ label: `"${filters.search}"`, key: "search" })
  if (filters.investorSearch) chips.push({ label: `Investor: ${filters.investorSearch}`, key: "investorSearch" })
  if (filters.location) chips.push({ label: filters.location, key: "location" })
  filters.sectors.forEach((s) => chips.push({ label: s, key: "sectors", value: s }))
  filters.stages.forEach((s) => chips.push({ label: s, key: "stages", value: s }))
  filters.years.forEach((y) => chips.push({ label: y, key: "years", value: y }))
  if (filters.minAmount > 0) chips.push({ label: `Min ₹${filters.minAmount}L`, key: "minAmount" })
  if (filters.maxAmount < 100000) chips.push({ label: `Max ₹${filters.maxAmount}L`, key: "maxAmount" })
  if (!filters.showUndisclosed) chips.push({ label: "Disclosed only", key: "showUndisclosed" })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 items-center py-3">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onRemove(chip.key, chip.value)}
          className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border-2 border-green-700 text-green-800 text-xs font-semibold hover:bg-green-100 transition-colors"
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClear}
          className="text-xs font-semibold text-gray-500 hover:text-red-600 underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
