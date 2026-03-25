"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"

const STAGE_ORDER = [
  "Angel", "Pre-Seed", "Seed", "Pre-Series A", "Series A",
  "Pre-Series B", "Series B", "Series C", "Series D", "Series E+",
  "Debt", "Growth", "IPO", "Acquisition", "Other",
]

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#c084fc",
  "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#f59e0b", "#f97316", "#ef4444", "#ec4899",
  "#14b8a6", "#64748b", "#94a3b8",
]

export function StageFunnel({ deals }: { deals: Deal[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>()
    for (const deal of deals) {
      const cur = map.get(deal.stage) ?? { count: 0, amount: 0 }
      map.set(deal.stage, { count: cur.count + 1, amount: cur.amount + deal.amount })
    }
    const ordered: { stage: string; count: number; amount: number }[] = []
    for (const s of STAGE_ORDER) {
      if (map.has(s)) ordered.push({ stage: s, ...map.get(s)! })
    }
    for (const [stage, vals] of map) {
      if (!STAGE_ORDER.includes(stage)) ordered.push({ stage, ...vals })
    }
    return ordered
  }, [deals])

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(val, name) => [val, name === "count" ? "Deals" : "₹ Cr"]}
            labelFormatter={(l) => `Stage: ${l}`}
          />
          <Bar dataKey="count" name="Deal count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
