"use client"

import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { fmtCrFromLakh } from "@/lib/dashboard/format"
import { isFundingDisclosed } from "@/lib/utils"

export function InvestorLeaderboard({
  deals,
  topN = 10,
  metric = "deal_count",
}: {
  deals: Deal[]
  topN?: number
  metric?: string
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { count: number; capital: number }>()
    for (const d of deals) {
      const disclosed = isFundingDisclosed(d.amount)
      for (const inv of d.investors ?? []) {
        const cur = map.get(inv) ?? { count: 0, capital: 0 }
        cur.count += 1
        if (disclosed) cur.capital += d.amount
        map.set(inv, cur)
      }
    }
    const sortKey = metric === "capital" ? "capital" : "count"
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b[sortKey] - a[sortKey])
      .slice(0, topN)
  }, [deals, topN, metric])

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b-2 border-black text-left text-[10px] uppercase tracking-wide text-gray-500">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Investor</th>
            <th className="py-1.5 pr-2 text-right">Deals</th>
            <th className="py-1.5 text-right">Capital</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-b border-gray-100 hover:bg-[#1A5D1A]/5">
              <td className="py-1.5 pr-2 font-mono text-gray-400">{i + 1}</td>
              <td className="py-1.5 pr-2 font-semibold">{r.name}</td>
              <td className="py-1.5 pr-2 text-right font-mono">{r.count}</td>
              <td className="py-1.5 text-right font-mono text-[#1A5D1A]">{fmtCrFromLakh(r.capital)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
