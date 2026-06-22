"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useMemo } from "react"
import { CHART_COLORS, TOOLTIP_STYLE } from "./chart-colors"
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
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={42}
            outerRadius={78}
            paddingAngle={1}
            label={({ percent }) => ((percent ?? 0) >= 0.08 ? `${((percent ?? 0) * 100).toFixed(0)}%` : "")}
            labelLine={false}
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#000" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Deals"]} />
          <Legend
            verticalAlign="bottom"
            height={48}
            iconType="square"
            wrapperStyle={{ fontSize: 11, lineHeight: "16px", overflow: "hidden" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
