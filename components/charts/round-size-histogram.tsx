"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { isFundingDisclosed } from "@/lib/utils"
import { ViewDataLink } from "./view-data-link"

// Round-size buckets, in ₹ Cr.
const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "<1", min: 0, max: 1 },
  { label: "1–5", min: 1, max: 5 },
  { label: "5–25", min: 5, max: 25 },
  { label: "25–100", min: 25, max: 100 },
  { label: "100–500", min: 100, max: 500 },
  { label: "500+", min: 500, max: Infinity },
]

export function RoundSizeHistogram({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const counts = BUCKETS.map((b) => ({ label: b.label, count: 0 }))
    for (const d of deals) {
      if (!isFundingDisclosed(d.amount)) continue
      const cr = d.amount / 100
      const idx = BUCKETS.findIndex((b) => cr >= b.min && cr < b.max)
      if (idx >= 0) counts[idx].count += 1
    }
    return counts
  }, [deals])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} label={{ value: "₹ Cr", position: "insideBottom", offset: -2, fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(val: number) => [val, "Deals"]} labelFormatter={(l) => `Round size: ₹${l} Cr`} />
            <Bar dataKey="count" name="Deals" fill="#1A5D1A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
