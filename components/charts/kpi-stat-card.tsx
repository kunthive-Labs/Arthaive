"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import type { KpiMetric } from "@/lib/dashboard/types"
import { fmtCr, fmtNumber } from "@/lib/dashboard/format"
import { isFundingDisclosed } from "@/lib/utils"

const METRIC_LABEL: Record<KpiMetric, string> = {
  total_capital: "Capital Tracked",
  deal_count: "Deals",
  avg_round: "Avg Round",
  unique_investors: "Investors",
  unique_sectors: "Sectors",
  unique_cities: "Cities",
  largest_round: "Largest Round",
}

function computeMetric(deals: Deal[], metric: KpiMetric): number {
  switch (metric) {
    case "deal_count":
      return deals.length
    case "total_capital": {
      const disclosed = deals.filter((d) => isFundingDisclosed(d.amount))
      return disclosed.reduce((s, d) => s + d.amount, 0) / 100 // lakh → Cr
    }
    case "avg_round": {
      const disclosed = deals.filter((d) => isFundingDisclosed(d.amount))
      if (!disclosed.length) return 0
      return disclosed.reduce((s, d) => s + d.amount, 0) / disclosed.length / 100
    }
    case "unique_investors": {
      const set = new Set<string>()
      for (const d of deals) for (const i of d.investors ?? []) set.add(i)
      return set.size
    }
    case "unique_sectors": {
      const set = new Set<string>()
      for (const d of deals) for (const s of d.sectors ?? []) set.add(s)
      return set.size
    }
    case "unique_cities": {
      const set = new Set<string>()
      for (const d of deals) if (d.location) set.add(d.location)
      return set.size
    }
    case "largest_round": {
      const max = Math.max(0, ...deals.map((d) => (isFundingDisclosed(d.amount) ? d.amount : 0)))
      return max / 100
    }
  }
}

function isCapital(metric: KpiMetric): boolean {
  return metric === "total_capital" || metric === "avg_round" || metric === "largest_round"
}

export function KpiStatCard({
  deals,
  metric = "total_capital",
  title,
}: {
  deals: Deal[]
  metric?: KpiMetric
  title?: string
}) {
  const { value, delta } = useMemo(() => {
    const value = computeMetric(deals, metric)

    // period-over-period: latest full year present vs the year before it
    const years = deals
      .map((d) => Number(d.date?.slice(0, 4)))
      .filter((y) => !Number.isNaN(y))
    let delta: number | null = null
    if (years.length) {
      const latest = Math.max(...years)
      const cur = deals.filter((d) => Number(d.date?.slice(0, 4)) === latest)
      const prev = deals.filter((d) => Number(d.date?.slice(0, 4)) === latest - 1)
      if (prev.length) {
        const curV = computeMetric(cur, metric)
        const prevV = computeMetric(prev, metric)
        if (prevV > 0) delta = ((curV - prevV) / prevV) * 100
      }
    }
    return { value, delta }
  }, [deals, metric])

  const display = isCapital(metric) ? fmtCr(value) : fmtNumber(Math.round(value))

  return (
    <div className="flex h-full flex-col justify-center p-4 md:p-5">
      <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">
        {title || METRIC_LABEL[metric]}
      </div>
      <div className="mt-1 font-mono text-3xl md:text-4xl font-bold tracking-tight text-[#1A5D1A]">
        {display}
      </div>
      {delta !== null && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${
            delta >= 0 ? "text-green-700" : "text-red-600"
          }`}
        >
          {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% YoY
        </div>
      )}
    </div>
  )
}
