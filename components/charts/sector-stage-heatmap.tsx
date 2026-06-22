"use client"

import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { hexToRgba } from "./chart-colors"
import { ViewDataLink } from "./view-data-link"

const STAGE_ORDER = [
  "Pre-Seed", "Seed", "Pre-Series A", "Series A", "Series B",
  "Series C", "Series D", "Series E+", "Growth", "Debt",
]

// Deal-count matrix of top sectors × funding stages.
export function SectorStageHeatmap({
  deals,
  topSectors = 12,
  sourceLink,
}: {
  deals: Deal[]
  topSectors?: number
  sourceLink?: string
}) {
  const { sectors, stages, matrix, max } = useMemo(() => {
    const sectorTotals = new Map<string, number>()
    for (const d of deals) for (const s of d.sectors ?? []) sectorTotals.set(s, (sectorTotals.get(s) ?? 0) + 1)
    const sectors = Array.from(sectorTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topSectors)
      .map(([s]) => s)

    const presentStages = new Set<string>()
    for (const d of deals) presentStages.add(d.stage)
    const stages = STAGE_ORDER.filter((s) => presentStages.has(s))

    const sectorIdx = new Map(sectors.map((s, i) => [s, i]))
    const stageIdx = new Map(stages.map((s, i) => [s, i]))
    const matrix: number[][] = sectors.map(() => stages.map(() => 0))
    let max = 0
    for (const d of deals) {
      const si = stageIdx.get(d.stage)
      if (si === undefined) continue
      for (const sec of d.sectors ?? []) {
        const ri = sectorIdx.get(sec)
        if (ri === undefined) continue
        matrix[ri][si] += 1
        if (matrix[ri][si] > max) max = matrix[ri][si]
      }
    }
    return { sectors, stages, matrix, max }
  }, [deals, topSectors])

  return (
    <>
      <div className="h-full overflow-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-1" />
              {stages.map((s) => (
                <th key={s} className="p-1 text-[10px] font-bold text-gray-600 align-bottom">
                  <span className="block whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{s}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map((sec, ri) => (
              <tr key={sec}>
                <th className="sticky left-0 bg-white p-1 pr-2 text-right text-[11px] font-semibold whitespace-nowrap">
                  {sec}
                </th>
                {stages.map((st, si) => {
                  const v = matrix[ri][si]
                  return (
                    <td
                      key={st}
                      title={`${sec} · ${st}: ${v} deals`}
                      className="h-7 w-9 border border-white text-center font-mono text-[10px]"
                      style={{ backgroundColor: max ? hexToRgba("#1A5D1A", v / max) : "transparent" }}
                    >
                      {v > 0 ? v : ""}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ViewDataLink href={sourceLink} />
    </>
  )
}
