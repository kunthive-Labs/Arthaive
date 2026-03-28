"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { FundingDeal } from "@/data/funding-data"

export function DealSimilar({ dealId }: { dealId: string }) {
  const [similar, setSimilar] = useState<FundingDeal[]>([])

  useEffect(() => {
    fetch(`/api/recommendations?id=${encodeURIComponent(dealId)}&n=5`)
      .then((r) => r.ok ? r.json() : [])
      .then(setSimilar)
  }, [dealId])

  if (!similar.length) return null

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Similar Deals</h2>
      <div className="space-y-2">
        {similar.map((deal) => (
          <Link
            key={deal.id}
            href={`/deal/${encodeURIComponent(deal.id)}`}
            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{deal.company}</p>
              <p className="text-xs text-muted-foreground">
                {(deal.sectors ?? []).slice(0, 2).join(" · ")} · {deal.stage}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">₹{deal.amount.toLocaleString("en-IN")} Cr</p>
              <p className="text-xs text-muted-foreground">{deal.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
