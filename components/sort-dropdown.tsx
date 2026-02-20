"use client"
import { SORT_OPTIONS } from "@/lib/constants"

interface SortDropdownProps { value: string; onChange: (v: string) => void }

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border-2 border-black px-3 py-1.5 text-sm font-semibold bg-white focus:outline-none"
    >
      {SORT_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
