"use client"

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { CHART_COLORS, TOOLTIP_STYLE, stageColor } from "./chart-colors"
import { ViewDataLink } from "./view-data-link"

const TOP_STAGES = 8

export function StagePie({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deals) map.set(d.stage, (map.get(d.stage) ?? 0) + 1)
    const sorted = Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([stage, count]) => ({ stage, count }))
    // Fold the long tail of rounds into one slice so the legend stays bounded.
    if (sorted.length <= TOP_STAGES) return sorted
    const head = sorted.slice(0, TOP_STAGES)
    const tail = sorted.slice(TOP_STAGES)
    return [
      ...head,
      { stage: `Other (${tail.length})`, count: tail.reduce((s, d) => s + d.count, 0) },
    ]
  }, [deals])

  return (
    <>
      <div className="h-full min-h-[200px]">
        <ResponsiveContainer width="100%" minWidth={0} height="100%">
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
                <Cell
                  key={i}
                  fill={stageColor(d.stage) ?? CHART_COLORS[i % CHART_COLORS.length]}
                  stroke="#000"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val: number, name) => [`${val} deals`, name]} />
            <Legend wrapperStyle={{ fontSize: 11, overflow: "hidden" }} iconType="square" />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
