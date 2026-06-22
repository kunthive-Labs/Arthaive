"use client"
import type { FundingDeal } from "@/data/funding-data"
import { formatCompact } from "@/lib/utils"

interface DealTableProps { deals: FundingDeal[]; onSelect?: (deal: FundingDeal) => void }

export function DealTable({ deals, onSelect }: DealTableProps) {
  return (
    // -webkit-overflow-scrolling for momentum scroll on iOS; min-w-full +
    // nowrap cells force the table to scroll horizontally on narrow screens
    // rather than cramming columns into illegible wrapped stacks.
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-4 font-bold whitespace-nowrap">Company</th>
            <th className="py-2 pr-4 font-bold whitespace-nowrap">Amount</th>
            <th className="py-2 pr-4 font-bold whitespace-nowrap">Stage</th>
            <th className="py-2 pr-4 font-bold whitespace-nowrap">Sector</th>
            <th className="py-2 font-bold whitespace-nowrap">City</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(deal => (
            <tr key={deal.id} onClick={() => onSelect?.(deal)} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
              <td className="py-2 pr-4 font-semibold whitespace-nowrap">{deal.company}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{formatCompact(deal.amount)}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{deal.stage}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{deal.sectors[0]}</td>
              <td className="py-2 whitespace-nowrap">{deal.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
