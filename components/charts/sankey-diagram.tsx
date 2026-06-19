"use client"

import { Sankey, Tooltip, ResponsiveContainer } from "recharts"
import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

export function SankeyDiagram({ deals, topInvestors = 10, topSectors = 8, sourceLink }: {
  deals: Deal[]
  topInvestors?: number
  topSectors?: number
  sourceLink?: string
}) {
  const { nodes, links } = useMemo(() => {
    const investorTotals = new Map<string, number>()
    const sectorTotals = new Map<string, number>()
    const flow = new Map<string, number>()

    for (const deal of deals) {
      const investor = deal.leadInvestor
      if (!investor || investor === "Unknown" || investor === "") continue
      for (const sector of deal.sectors ?? []) {
        investorTotals.set(investor, (investorTotals.get(investor) ?? 0) + deal.amount)
        sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + deal.amount)
        const key = `${investor}|||${sector}`
        flow.set(key, (flow.get(key) ?? 0) + deal.amount)
      }
    }

    const topInv = Array.from(investorTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topInvestors)
      .map(([name]) => name)

    const topSec = Array.from(sectorTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topSectors)
      .map(([name]) => name)

    const nodes = [
      ...topInv.map((name) => ({ name })),
      ...topSec.map((name) => ({ name })),
    ]

    const nodeIndex = new Map(nodes.map((n, i) => [n.name, i]))

    const links: { source: number; target: number; value: number }[] = []
    for (const [key, value] of flow) {
      const [inv, sec] = key.split("|||")
      if (topInv.includes(inv) && topSec.includes(sec)) {
        links.push({
          source: nodeIndex.get(inv)!,
          target: nodeIndex.get(sec)!,
          value: Math.round(value),
        })
      }
    }

    return { nodes, links }
  }, [deals, topInvestors, topSectors])

  if (!links.length) {
    return <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">Insufficient data</div>
  }

  return (
    <>
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={{ fill: "hsl(var(--primary))", stroke: "transparent" }}
          link={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2 }}
          margin={{ top: 8, right: 120, left: 8, bottom: 8 }}
        >
          <Tooltip
            formatter={(val: number) => [`₹${val.toLocaleString("en-IN")} Cr`]}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
    <ViewDataLink href={sourceLink} />
    </>
  )
}
