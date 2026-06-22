"use client"

import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { fmtCrFromLakh } from "@/lib/dashboard/format"
import { isFundingDisclosed } from "@/lib/utils"

export function TopDealsTable({
  deals,
  topN = 10,
}: {
  deals: Deal[]
  topN?: number
}) {
  const rows = useMemo(
    () =>
      deals
        .filter((d) => isFundingDisclosed(d.amount))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, topN),
    [deals, topN]
  )

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b-2 border-black text-left text-[10px] uppercase tracking-wide text-gray-500">
            <th className="py-1.5 pr-2">Company</th>
            <th className="py-1.5 pr-2">Stage</th>
            <th className="py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-b border-gray-100 hover:bg-[#1A5D1A]/5">
              <td className="py-1.5 pr-2 font-semibold">
                {d.company}
                <span className="ml-1 text-[11px] font-normal text-gray-400">{d.location}</span>
              </td>
              <td className="py-1.5 pr-2 text-xs text-gray-500">{d.stage}</td>
              <td className="py-1.5 text-right font-mono text-[#1A5D1A]">{fmtCrFromLakh(d.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
