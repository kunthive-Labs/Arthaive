"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"
import { CHART_COLORS, CHART_GRID_COLOR, TOOLTIP_STYLE } from "./chart-colors"

// Comparing every year since 2005 would stack 20+ bars per month with a
// legend to match — unreadable. Show the most recent N years only.
const YEARS_SHOWN = 6

export function YoYComparison({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const { data, years } = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    const yearSet = new Set<string>()

    for (const deal of deals) {
      const year = deal.date.slice(0, 4)
      const month = deal.date.slice(5, 7)
      yearSet.add(year)
      if (!map.has(month)) map.set(month, new Map())
      const cur = map.get(month)!.get(year) ?? 0
      map.get(month)!.set(year, cur + deal.amount)
    }

    const years = Array.from(yearSet).sort().slice(-YEARS_SHOWN)
    const data = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, yearMap]) => {
        const entry: Record<string, unknown> = {
          month: new Date(`2000-${month}-01`).toLocaleDateString("en-IN", { month: "short" }),
        }
        for (const y of years) entry[y] = Math.round(yearMap.get(y) ?? 0)
        return entry
      })

    return { data, years }
  }, [deals])

  return (
    <>
    <div className="h-64 md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`]} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {years.map((year, i) => (
            <Bar key={year} dataKey={year} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
