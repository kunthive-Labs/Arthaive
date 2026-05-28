"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AILabel, AISection } from "@/components/ai-label"
import { formatCurrency } from "@/lib/format"
import type { Deal } from "@/lib/types"

interface NLResponse {
  deals: Deal[]
  total: number
  explanation: string
  filters: Record<string, unknown>
  error?: string
}

const EXAMPLES = [
  "fintech Series A in Bangalore 2025",
  "healthtech seed rounds above 50 lakhs",
  "Sequoia investments in SaaS",
  "edtech deals in Mumbai last year",
]

export default function NLSearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NLResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/search/nl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const data = (await res.json()) as NLResponse
      if (!res.ok) {
        setError(data.error || "Search failed")
        return
      }
      setResult(data)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(query)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
        <div className="mb-2">
          <AILabel>AI-powered query parser — all results are verified records</AILabel>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
          Natural-language search
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Ask in plain English. AI interprets your query into filters; the deals shown are real, source-backed entries.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. fintech Series A in Bangalore 2025"
            maxLength={400}
            className="flex-1 border-2 border-black px-4 py-3 text-base focus:outline-none focus:bg-yellow-50"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="border-2 border-black bg-black text-white px-6 py-3 font-bold uppercase tracking-wide hover:bg-green-700 hover:border-green-700 transition disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex)
                run(ex)
              }}
              className="text-xs border border-gray-300 px-2 py-1 hover:bg-gray-100"
            >
              {ex}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 border-2 border-red-500 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8">
            <AISection label={`AI parsed: ${result.explanation}`}>
              <p className="text-sm text-gray-700">
                <strong>{result.total.toLocaleString()}</strong> verified deals match. Showing top {result.deals.length}.
              </p>
            </AISection>

            <div className="mt-6 space-y-2">
              {result.deals.length === 0 && (
                <div className="border-2 border-black p-8 text-center text-gray-500">
                  No verified deals match this query.
                </div>
              )}

              {result.deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deal/${deal.id}`}
                  className="flex items-center justify-between border-2 border-black p-3 hover:bg-gray-50 transition"
                >
                  <div className="min-w-0">
                    <div className="font-bold truncate">{deal.company}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {deal.stage}
                      {deal.sectors[0] ? ` · ${deal.sectors[0]}` : ""}
                      {deal.location ? ` · ${deal.location}` : ""}
                      {deal.date ? ` · ${deal.date}` : ""}
                    </div>
                  </div>
                  <div className="font-bold shrink-0 ml-3">
                    {deal.amount > 0 ? formatCurrency(deal.amount) : "—"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
