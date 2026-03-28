"use client"

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"

const METRICS = ["deal_count", "total_funding", "avg_size", "yoy_growth"] as const

export function SectorRadar({
  deals,
  sectors,
}: {
  deals: Deal[]
  sectors: string[]
}) {
  const data = useMemo(() => {
    const sectorStats = new Map<string, { count: number; total: number }>()
    for (const deal of deals) {
      for (const s of deal.sectors ?? []) {
        const cur = sectorStats.get(s) ?? { count: 0, total: 0 }
        sectorStats.set(s, { count: cur.count + 1, total: cur.total + deal.amount })
      }
    }

    const maxCount = Math.max(...Array.from(sectorStats.values()).map((v) => v.count))
    const maxTotal = Math.max(...Array.from(sectorStats.values()).map((v) => v.total))

    return sectors.map((sector) => {
      const stats = sectorStats.get(sector) ?? { count: 0, total: 0 }
      return {
        sector: sector.length > 10 ? sector.slice(0, 10) + "…" : sector,
        fullName: sector,
        count: maxCount ? Math.round((stats.count / maxCount) * 100) : 0,
        funding: maxTotal ? Math.round((stats.total / maxTotal) * 100) : 0,
      }
    })
  }, [deals, sectors])

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="sector" tick={{ fontSize: 11 }} />
          <Radar name="Deal count" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          <Radar name="Funding" dataKey="funding" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
          <Legend />
          <Tooltip formatter={(v: number) => [`${v}%`]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
