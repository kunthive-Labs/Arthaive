"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

interface Props {
  deals: Deal[]
  groupBy?: "month" | "week"
  sourceLink?: string
}

function groupDealsByMonth(deals: Deal[]) {
  const map = new Map<string, { amount: number; count: number }>()
  for (const deal of deals) {
    const key = deal.date.slice(0, 7) // YYYY-MM
    const cur = map.get(key) ?? { amount: 0, count: 0 }
    map.set(key, { amount: cur.amount + deal.amount, count: cur.count + 1 })
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { amount, count }]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      amount: Math.round(amount),
      count,
    }))
}

export function FundingTrendLine({ deals, sourceLink }: Props) {
  const data = useMemo(() => groupDealsByMonth(deals), [deals])

  return (
    <>
    <div className="h-72">
      <ResponsiveContainer width="100%" minWidth={0} height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`, "Total funding"]}
            labelFormatter={(l) => `Month: ${l}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="amount"
            name="Funding (₹ Cr)"
            stroke="hsl(var(--primary))"
            fill="url(#colorAmount)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
