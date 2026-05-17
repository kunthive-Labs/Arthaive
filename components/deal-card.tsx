"use client"

import Link from "next/link"
import { formatFundingAmount } from "@/lib/utils"

interface DealCardProps {
  deal: {
    id: string
    company: string
    amount: number
    stage: string
    sectors: string[]
    investors: string[]
    date: string
    location: string
  }
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deal/${encodeURIComponent(deal.id)}`}>
      <div className="neo-border neo-hover p-6 bg-white cursor-pointer h-full flex flex-col">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1 line-clamp-2">{deal.company}</h3>
            <div className="text-xs text-gray-600 mb-2">{deal.location}</div>
          </div>
          <div className="bg-green-700 text-white px-3 py-1 font-bold text-xs whitespace-nowrap">{deal.stage}</div>
        </div>

        <div className="mb-4">
          <div className="text-2xl font-bold text-green-700 mb-1">{formatFundingAmount(deal.amount)}</div>
          <div className="flex flex-wrap gap-2">
            {deal.sectors.map((sector) => (
              <span key={sector} className="neo-border-accent px-2 py-1 text-xs font-semibold bg-white">
                {sector}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t-2 border-gray-200">
          <div className="text-xs font-semibold text-gray-600 uppercase">Led by</div>
          <div className="text-sm font-bold mt-1 truncate">{deal.investors[0]}</div>
        </div>
      </div>
    </Link>
  )
}
