"use client"
import { AMOUNT_RANGES } from "@/lib/constants"

interface AmountFilterProps { value: number; onChange: (min: number, max: number) => void }

export function AmountFilter({ value, onChange }: AmountFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {AMOUNT_RANGES.map(range => {
        const selected = value === range.min
        return (
          <button
            key={range.label}
            onClick={() => onChange(range.min, range.max)}
            aria-pressed={selected}
            className={`px-3 py-1 text-xs font-bold border-2 border-black transition-colors ${
              selected ? "bg-black text-white" : "hover:bg-black hover:text-white"
            }`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
