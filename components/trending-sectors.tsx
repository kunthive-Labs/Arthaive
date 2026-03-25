"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { FundingDeal as Deal } from "@/data/funding-data"

export function TrendingSectors({ deals }: { deals: Deal[] }) {
  const sectors = useMemo(() => {
    const now = new Date()
    const cutoff30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    const cutoff60 = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)

    const recent = new Map<string, number>()
    const prev = new Map<string, number>()

    for (const deal of deals) {
      for (const sector of deal.sectors ?? []) {
        if (deal.date >= cutoff30) {
          recent.set(sector, (recent.get(sector) ?? 0) + 1)
        } else if (deal.date >= cutoff60) {
          prev.set(sector, (prev.get(sector) ?? 0) + 1)
        }
      }
    }

    return Array.from(recent.entries())
      .map(([sector, count]) => {
        const prevCount = prev.get(sector) ?? 0
        const change = prevCount > 0 ? Math.round(((count - prevCount) / prevCount) * 100) : 0
        return { sector, count, change }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [deals])

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-3 text-sm">Trending Sectors (30d)</h3>
      <div className="space-y-2">
        {sectors.map(({ sector, count, change }) => (
          <div key={sector} className="flex items-center justify-between text-sm">
            <span className="truncate flex-1 text-muted-foreground" title={sector}>{sector}</span>
            <span className="font-mono text-xs mr-2">{count} deals</span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-muted-foreground"
            }`}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {change !== 0 && `${Math.abs(change)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
