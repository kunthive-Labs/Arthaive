"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

export function DealCountTrend({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deals) {
      const key = d.date.slice(0, 7) // YYYY-MM
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        count,
      }))
  }, [deals])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(val: number) => [val, "Deals"]}
              labelFormatter={(l) => `Month: ${l}`}
            />
            <Line type="monotone" dataKey="count" name="Deals" stroke="#1A5D1A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
