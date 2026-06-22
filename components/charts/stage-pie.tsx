"use client"

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { CHART_COLORS, stageColor } from "./chart-colors"
import { ViewDataLink } from "./view-data-link"

export function StagePie({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deals) map.set(d.stage, (map.get(d.stage) ?? 0) + 1)
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([stage, count]) => ({ stage, count }))
  }, [deals])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="stage"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={1}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={stageColor(d.stage) ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: number, name) => [`${val} deals`, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
