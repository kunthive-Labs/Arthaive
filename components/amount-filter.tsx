"use client"
import { AMOUNT_RANGES } from "@/lib/constants"

interface AmountFilterProps { value: number; onChange: (min: number, max: number) => void }

export function AmountFilter({ value, onChange }: AmountFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {AMOUNT_RANGES.map(range => (
        <button
          key={range.label}
          onClick={() => onChange(range.min, range.max)}
          className="px-3 py-1 text-xs font-bold border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
