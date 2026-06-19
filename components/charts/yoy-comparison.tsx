"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

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

    const years = Array.from(yearSet).sort()
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

  const COLORS = ["hsl(var(--primary))", "#06b6d4", "#f59e0b", "#10b981"]

  return (
    <>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`]} />
          <Legend />
          {years.map((year, i) => (
            <Bar key={year} dataKey={year} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
