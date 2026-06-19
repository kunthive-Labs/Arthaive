"use client"

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

function sparkData(deals: Deal[], sector: string) {
  const weekMap = new Map<string, number>()
  for (const deal of deals) {
    if (!deal.sectors?.includes(sector)) continue
    const d = new Date(deal.date)
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const week = Math.floor((d.getTime() - startOfYear.getTime()) / (7 * 86400000))
    const key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
  }
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
    .map(([week, count]) => ({ week, count }))
}

export function DealVelocity({ deals, sectors, sourceLink }: { deals: Deal[]; sectors: string[]; sourceLink?: string }) {
  const rows = useMemo(
    () => sectors.map((sector) => ({ sector, data: sparkData(deals, sector) })),
    [deals, sectors]
  )

  return (
    <div className="space-y-2">
      {rows.map(({ sector, data }) => {
        const last = data.at(-1)?.count ?? 0
        const prev = data.at(-2)?.count ?? 0
        const trend = last > prev ? "▲" : last < prev ? "▼" : "—"
        const trendColor = last > prev ? "text-green-600" : last < prev ? "text-red-500" : "text-muted-foreground"

        return (
          <div key={sector} className="flex items-center gap-4 rounded-lg border px-4 py-2">
            <span className="w-40 truncate text-sm font-medium" title={sector}>{sector}</span>
            <div className="flex-1 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
                  <Tooltip
                    content={({ payload }) =>
                      payload?.[0] ? (
                        <div className="text-xs border bg-background rounded px-2 py-1 shadow">
                          {payload[0].payload.week}: {payload[0].value} deals
                        </div>
                      ) : null
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <span className={`text-sm font-mono ${trendColor}`}>{trend} {last}</span>
          </div>
        )
      })}
      <ViewDataLink href={sourceLink} />
    </div>
  )
}
