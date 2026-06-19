"use client"

import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function FundingHeatmap({ deals, topSectors = 12, sourceLink }: { deals: Deal[]; topSectors?: number; sourceLink?: string }) {
  const { sectors, grid, maxVal } = useMemo(() => {
    const sectorTotals = new Map<string, number>()
    const cell = new Map<string, number>()

    for (const deal of deals) {
      const month = parseInt(deal.date.slice(5, 7), 10) - 1
      for (const sector of deal.sectors ?? []) {
        sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + deal.amount)
        const key = `${sector}__${month}`
        cell.set(key, (cell.get(key) ?? 0) + deal.amount)
      }
    }

    const sectors = Array.from(sectorTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topSectors)
      .map(([s]) => s)

    const grid = sectors.map((sector) =>
      MONTHS.map((_, mi) => Math.round(cell.get(`${sector}__${mi}`) ?? 0))
    )

    const maxVal = Math.max(...grid.flat())
    return { sectors, grid, maxVal }
  }, [deals, topSectors])

  function opacity(val: number) {
    if (!maxVal) return 0
    return Math.max(0.05, val / maxVal)
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left pr-3 py-1 font-medium text-muted-foreground w-36">Sector</th>
            {MONTHS.map((m) => (
              <th key={m} className="text-center py-1 font-medium text-muted-foreground px-1">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector, si) => (
            <tr key={sector}>
              <td className="pr-3 py-0.5 truncate max-w-[144px] text-muted-foreground" title={sector}>{sector}</td>
              {grid[si].map((val, mi) => (
                <td key={mi} className="text-center py-0.5 px-1">
                  <div
                    className="h-6 w-full rounded-sm flex items-center justify-center text-[10px]"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${opacity(val)})`,
                      color: opacity(val) > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                    }}
                    title={val ? `₹${val.toLocaleString("en-IN")} Cr` : "—"}
                  >
                    {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val) : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
