"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"

const BUCKETS = [
  { label: "<5 Cr", min: 0, max: 5 },
  { label: "5–25", min: 5, max: 25 },
  { label: "25–100", min: 25, max: 100 },
  { label: "100–500", min: 100, max: 500 },
  { label: "500–1K", min: 500, max: 1000 },
  { label: "1K–5K", min: 1000, max: 5000 },
  { label: ">5K", min: 5000, max: Infinity },
]

export function SizeHistogram({ deals }: { deals: Deal[] }) {
  const data = useMemo(() => {
    return BUCKETS.map(({ label, min, max }) => ({
      label,
      count: deals.filter((d) => d.amount >= min && d.amount < max).length,
    }))
  }, [deals])

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" minWidth={0} height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [v, "Deals"]} />
          <Bar dataKey="count" name="Deal count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
