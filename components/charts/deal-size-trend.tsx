"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { isFundingDisclosed } from "@/lib/utils"
import { ViewDataLink } from "./view-data-link"

function median(nums: number[]): number {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Average & median disclosed round size per year, in ₹ Cr.
export function DealSizeTrend({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const byYear = new Map<string, number[]>()
    for (const d of deals) {
      if (!isFundingDisclosed(d.amount)) continue
      const year = d.date?.slice(0, 4)
      if (!year) continue
      const arr = byYear.get(year) ?? []
      arr.push(d.amount / 100)
      byYear.set(year, arr)
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amounts]) => ({
        year,
        avg: Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length),
        median: Math.round(median(amounts)),
      }))
  }, [deals])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}Cr`} />
            <Tooltip formatter={(val: number, name) => [`₹${val} Cr`, name]} labelFormatter={(l) => `Year: ${l}`} />
            <Legend />
            <Line type="monotone" dataKey="avg" name="Average" stroke="#1A5D1A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="median" name="Median" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
