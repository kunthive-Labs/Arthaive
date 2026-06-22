"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { CHART_COLORS } from "./chart-colors"
import { fmtCr } from "@/lib/dashboard/format"
import { ViewDataLink } from "./view-data-link"

export function CityBarChart({
  deals,
  topN = 10,
  sourceLink,
}: {
  deals: Deal[]
  topN?: number
  sourceLink?: string
}) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deals) {
      if (!d.location) continue
      map.set(d.location, (map.get(d.location) ?? 0) + d.amount)
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([city, amount]) => ({ city, amount: Math.round(amount / 100) }))
  }, [deals, topN])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCr(v)} />
            <YAxis type="category" dataKey="city" width={110} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`, "Total"]} />
            <Bar dataKey="amount" name="Funding (₹ Cr)" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
