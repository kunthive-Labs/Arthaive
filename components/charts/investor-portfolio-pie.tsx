"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useMemo } from "react"
import { CHART_COLORS } from "./chart-colors"
import type { FundingDeal as Deal } from "@/data/funding-data"

export function InvestorPortfolioPie({ deals, investorName }: { deals: Deal[]; investorName: string }) {
  const data = useMemo(() => {
    const sectorMap = new Map<string, number>()
    for (const deal of deals) {
      if (!deal.investors?.includes(investorName) && deal.leadInvestor !== investorName) continue
      for (const sector of deal.sectors ?? []) {
        sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1)
      }
    }
    return Array.from(sectorMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [deals, investorName])

  if (!data.length) return null

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [v, "Deals"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
