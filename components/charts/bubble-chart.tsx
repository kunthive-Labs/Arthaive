"use client"

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

export function BubbleChart({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const deal of deals) {
      for (const sector of deal.sectors ?? []) {
        const cur = map.get(sector) ?? { count: 0, total: 0 }
        map.set(sector, { count: cur.count + 1, total: cur.total + deal.amount })
      }
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.count >= 3)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 30)
      .map(([sector, { count, total }]) => ({
        sector,
        count,
        avgSize: Math.round(total / count),
        total: Math.round(total),
      }))
  }, [deals])

  return (
    <>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 16, left: 16, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" dataKey="count" name="Deal count" tick={{ fontSize: 11 }}>
            <Label value="Number of deals" position="insideBottom" offset={-12} fontSize={12} />
          </XAxis>
          <YAxis type="number" dataKey="avgSize" name="Avg deal size" tick={{ fontSize: 11 }}
            tickFormatter={(v) => `₹${v}`} />
          <ZAxis type="number" dataKey="total" range={[40, 1200]} name="Total funding" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="rounded-lg border bg-background p-3 shadow text-xs">
                  <p className="font-semibold mb-1">{d.sector}</p>
                  <p>Deals: {d.count}</p>
                  <p>Avg size: ₹{d.avgSize.toLocaleString("en-IN")} Cr</p>
                  <p>Total: ₹{d.total.toLocaleString("en-IN")} Cr</p>
                </div>
              )
            }}
          />
          <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
