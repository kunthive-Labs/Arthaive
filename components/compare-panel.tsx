"use client"
import type { FundingDeal } from "@/data/funding-data"
import { formatCompact } from "@/lib/utils"

interface ComparePanelProps { deals: FundingDeal[]; onRemove: (id: string) => void }

export function ComparePanel({ deals, onRemove }: ComparePanelProps) {
  if (!deals.length) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <span className="text-sm font-bold">Compare ({deals.length}/3):</span>
        <div className="flex gap-2 flex-1 flex-wrap">
          {deals.map(d => (
            <div key={d.id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs font-semibold border border-black">
              {d.company} · {formatCompact(d.amount)}
              <button onClick={() => onRemove(d.id)} className="ml-1 font-bold hover:text-red-600">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
