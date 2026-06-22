"use client"

import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { DealNotes } from "@/components/deal-notes"
import { formatInrLakhs } from "@/lib/format"
import { useClipboard } from "@/hooks/use-clipboard"

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function DealDetail({ deal }: DealDetailProps) {
  const otherInvestors = deal.investors.filter((inv) => inv !== deal.leadInvestor)
  const { copied, copy } = useClipboard()

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <BackButton fallback="/explore" />
        <button
          type="button"
          onClick={() => copy(typeof window !== "undefined" ? window.location.href : "")}
          className="px-3 py-1.5 text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      {/* Hero card */}
      <div className="neo-border bg-white mb-6">
        <div className="p-8 border-b-4 border-black">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-block bg-green-700 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3">
                {deal.stage}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">{deal.company}</h1>
              <p className="text-gray-500 font-semibold mt-2 text-sm uppercase tracking-wide">
                {deal.location} &nbsp;·&nbsp; {formatDate(deal.date)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl md:text-5xl font-bold text-green-700">{formatInrLakhs(deal.amount)}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Funding Raised</div>
            </div>
          </div>
        </div>

        {/* Sectors strip */}
        <div className="px-8 py-4 flex flex-wrap gap-2">
          {deal.sectors.map((sector) => (
            <span key={sector} className="neo-border-accent px-3 py-1 text-xs font-bold uppercase bg-white">
              {sector}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="neo-border p-6 bg-white">
            <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-3">About this Deal</h2>
            <p className="text-gray-700 leading-relaxed text-base">{deal.description}</p>
          </div>

          {/* Private research notes + tags */}
          <DealNotes dealId={deal.id} />

          {/* Source */}
          {deal.sourceUrl && (
            <div className="neo-border p-5 bg-green-50 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1">Source</div>
                <div className="text-sm text-gray-600 truncate max-w-sm">{deal.sourceUrl}</div>
              </div>
              <a
                href={deal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-green-700 text-white font-bold text-sm px-4 py-2 hover:bg-green-800 transition-colors"
              >
                Read Article ↗
              </a>
            </div>
          )}
        </div>

        {/* Right column — investors */}
        <div className="neo-border bg-white p-6 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-4">Investors</h2>

          <div className="mb-4">
            <div className="text-xs font-bold uppercase text-gray-400 mb-2">Lead</div>
            <Link
              href={`/investors/${encodeURIComponent(deal.leadInvestor)}`}
              className="block bg-green-700 text-white font-bold text-sm px-4 py-3 hover:bg-green-800 transition-colors"
            >
              {deal.leadInvestor}
            </Link>
          </div>

          {otherInvestors.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase text-gray-400 mb-2">Co-investors</div>
              <div className="space-y-2">
                {otherInvestors.map((inv) => (
                  <Link
                    key={inv}
                    href={`/investors/${encodeURIComponent(inv)}`}
                    className="block border-2 border-gray-200 px-4 py-2 text-sm font-semibold hover:border-black transition-colors"
                  >
                    {inv}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
