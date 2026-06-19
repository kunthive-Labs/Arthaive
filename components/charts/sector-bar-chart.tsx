"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

const COLORS = [
  "hsl(var(--primary))", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#f97316", "#84cc16", "#3b82f6", "#ec4899",
  "#14b8a6", "#a855f7", "#eab308", "#22c55e", "#6366f1",
]

export function SectorBarChart({ deals, topN = 15, sourceLink }: { deals: Deal[]; topN?: number; sourceLink?: string }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const deal of deals) {
      for (const sector of deal.sectors ?? []) {
        map.set(sector, (map.get(sector) ?? 0) + deal.amount)
      }
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([sector, amount]) => ({ sector, amount: Math.round(amount) }))
  }, [deals, topN])

  return (
    <>
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <YAxis type="category" dataKey="sector" width={140} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`, "Total"]} />
          <Bar dataKey="amount" name="Funding (₹ Cr)" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
