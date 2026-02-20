"use client"
import type { FundingDeal } from "@/data/funding-data"
import { formatCompact } from "@/lib/utils"

interface DealTableProps { deals: FundingDeal[]; onSelect?: (deal: FundingDeal) => void }

export function DealTable({ deals, onSelect }: DealTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-4 font-bold">Company</th>
            <th className="py-2 pr-4 font-bold">Amount</th>
            <th className="py-2 pr-4 font-bold">Stage</th>
            <th className="py-2 pr-4 font-bold">Sector</th>
            <th className="py-2 font-bold">City</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(deal => (
            <tr key={deal.id} onClick={() => onSelect?.(deal)} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
              <td className="py-2 pr-4 font-semibold">{deal.company}</td>
              <td className="py-2 pr-4">{formatCompact(deal.amount)}</td>
              <td className="py-2 pr-4">{deal.stage}</td>
              <td className="py-2 pr-4">{deal.sectors[0]}</td>
              <td className="py-2">{deal.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
