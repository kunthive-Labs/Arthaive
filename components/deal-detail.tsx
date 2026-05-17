"use client"

import Link from "next/link"
import { BackButton } from "@/components/back-button"

interface DealDetailProps {
  deal: {
    id: string
    company: string
    amount: number
    stage: string
    sectors: string[]
    investors: string[]
    leadInvestor: string
    date: string
    location: string
    description: string
    sourceUrl?: string
  }
}

export function DealDetail({ deal }: DealDetailProps) {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
      <BackButton fallback="/explore" />
      {/* Header */}
      <div className="neo-border p-8 mb-8 bg-white">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm w-fit mb-4">{deal.stage}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 break-words">{deal.company}</h1>
            <div className="text-sm text-gray-600 uppercase font-semibold mb-4">
              {deal.location} • {new Date(deal.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="text-5xl font-bold text-green-700 mb-2">₹{(deal.amount / 100).toFixed(0)}Cr</div>
        <div className="text-sm text-gray-600 uppercase font-semibold">Funding Amount</div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Description */}
        <div className="md:col-span-2">
          <div className="neo-border p-6 mb-6 bg-white">
            <h2 className="font-bold text-lg uppercase mb-4 text-green-700">About</h2>
            <p className="text-gray-700 leading-relaxed">{deal.description}</p>
          </div>

          {/* Sectors */}
          <div className="neo-border p-6 bg-white">
            <h3 className="font-bold text-lg uppercase mb-4 text-green-700">Sectors</h3>
            <div className="flex flex-wrap gap-3">
              {deal.sectors.map((sector) => (
                <div key={sector} className="neo-border-accent px-4 py-2 font-semibold text-sm">
                  {sector}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Investors */}
        <div className="neo-border p-6 bg-white h-fit">
          <h3 className="font-bold text-lg uppercase mb-6 text-green-700">Investors</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold uppercase text-gray-600 mb-1">Lead Investor</div>
              <div className="font-bold text-sm bg-green-700 text-white px-3 py-2">{deal.leadInvestor}</div>
            </div>

            {deal.investors.length > 1 && (
              <div className="border-t-2 border-gray-200 pt-4">
                <div className="text-xs font-bold uppercase text-gray-600 mb-2">Other Investors</div>
                <div className="space-y-2">
                  {deal.investors.map((inv) => (
                    <div key={inv} className="text-sm font-semibold px-3 py-2 bg-gray-100">
                      {inv}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source Link */}
      {deal.sourceUrl && (
        <div className="neo-border p-6 bg-green-50 mb-8">
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-green-700 hover:text-green-900 flex items-center gap-2 group"
          >
            View Original Source →<span className="group-hover:translate-x-1 transition">↗</span>
          </a>
        </div>
      )}

      {/* Back Link */}
      <Link href="/explore" className="font-bold text-green-700 hover:text-green-900 flex items-center gap-2">
        ← Back to Explore
      </Link>
    </main>
  )
}
