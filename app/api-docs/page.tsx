import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"

export const metadata: Metadata = {
  title: "API documentation",
  description: "Public REST API for India startup funding data — versioned endpoints, JSON, key-based rate limits.",
}

interface Endpoint {
  method: "GET"
  path: string
  desc: string
  params: { name: string; type: string; required?: boolean; note: string }[]
  example: { curl: string; response: string }
}

const API_BASE_URL = "https://arthaive.kunthive.in"

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/startups",
    desc: "List startups (one row per company, most-recent round).",
    params: [
      { name: "sector", type: "string[]", note: "Repeatable. e.g. ?sector=Fintech&sector=SaaS" },
      { name: "city", type: "string", note: "City name (e.g. Bangalore)." },
      { name: "stage", type: "string[]", note: "Repeatable." },
      { name: "page", type: "number", note: "Default 1." },
      { name: "limit", type: "number", note: "Default 20, max 100." },
    ],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/startups?sector=Fintech&city=Bangalore&limit=2' \\
  -H 'X-API-Key: ifk_...'`,
      response: `{
  "data": [
    {
      "company": "ExampleCo",
      "latest_deal_id": "deal_123",
      "latest_stage": "Series A",
      "latest_amount_inr": 8400,
      "latest_deal_date": "2025-09-12",
      "sectors": ["Fintech"],
      "city": "Bangalore"
    }
  ],
  "meta": { "total": 47, "page": 1, "limit": 2, "version": "1", "coverage_note": "..." }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/startups/:id",
    desc: "Full deal history for a startup (id can be a deal id or company name).",
    params: [{ name: "id", type: "string", required: true, note: "Path param — deal id or URL-encoded company name." }],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/startups/ExampleCo'`,
      response: `{
  "data": {
    "company": "ExampleCo",
    "total_rounds": 3,
    "total_raised_inr": 18400,
    "rounds": [ { "id": "...", "stage": "Series A", "amount_inr": 8400, "deal_date": "..." } ]
  },
  "meta": { "version": "1", "coverage_note": "..." }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/funding-rounds",
    desc: "Paginated funding rounds (one row per deal).",
    params: [
      { name: "sector", type: "string[]", note: "Repeatable." },
      { name: "stage", type: "string[]", note: "Repeatable. Underscores normalised: series_a → Series A." },
      { name: "city", type: "string", note: "City filter." },
      { name: "investor", type: "string", note: "Substring match on investor list." },
      { name: "from", type: "YYYY-MM-DD", note: "Lower bound on deal_date." },
      { name: "to", type: "YYYY-MM-DD", note: "Upper bound on deal_date." },
      { name: "min_amount", type: "number", note: "INR lakhs." },
      { name: "max_amount", type: "number", note: "INR lakhs." },
      { name: "sort", type: "date|amount", note: "Default date." },
      { name: "page", type: "number", note: "Default 1." },
      { name: "limit", type: "number", note: "Default 20, max 100." },
    ],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/funding-rounds?sector=Edtech&stage=series_a&from=2024-01-01&to=2024-12-31'`,
      response: `{
  "data": [ { "id": "...", "company": "...", "amount_inr": 5000, "stage": "Series A", "deal_date": "...", "investors": [...] } ],
  "meta": { "total": 18, "page": 1, "limit": 20, "version": "1", "coverage_note": "..." }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/investors/:id",
    desc: "Investor profile + deal history. :id is the kebab-case slug.",
    params: [{ name: "id", type: "string", required: true, note: "Investor slug (e.g. sequoia-india)." }],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/investors/sequoia-india'`,
      response: `{
  "data": {
    "name": "Sequoia India",
    "deal_count": 42,
    "total_deployed_inr": 250000,
    "sectors": ["Fintech","SaaS"],
    "deals": [ ... ]
  },
  "meta": { "version": "1" }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/trends/monthly",
    desc: "Monthly deal counts and totals.",
    params: [
      { name: "year", type: "number", note: "If omitted, returns last 24 months." },
      { name: "sector", type: "string", note: "Optional sector filter." },
    ],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/trends/monthly?year=2024'`,
      response: `{
  "data": [ { "month": "2024-01", "deal_count": 38, "total_funding_inr": 124300 } ],
  "meta": { "total": 12, "version": "1" }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/trends/sectors",
    desc: "Sector-level totals across the verified deal pool.",
    params: [
      { name: "from", type: "YYYY-MM-DD", note: "Optional." },
      { name: "to", type: "YYYY-MM-DD", note: "Optional." },
    ],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/trends/sectors'`,
      response: `{
  "data": [ { "sector": "Fintech", "deal_count": 312, "total_funding_inr": 850000 } ],
  "meta": { "total": 20, "version": "1" }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/v1/search",
    desc: "Keyword search across company names.",
    params: [
      { name: "q", type: "string", required: true, note: "1-200 chars." },
      { name: "page", type: "number", note: "Default 1." },
      { name: "limit", type: "number", note: "Default 20, max 100." },
    ],
    example: {
      curl: `curl '${API_BASE_URL}/api/v1/search?q=razorpay'`,
      response: `{
  "data": [ { "id": "...", "company": "Razorpay", "amount_inr": ..., "stage": "..." } ],
  "meta": { "total": 5, "page": 1, "limit": 20, "version": "1" }
}`,
    },
  },
]

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-gray-900 text-gray-100 text-xs p-4 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">API documentation</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Versioned REST API. JSON responses. Same data that powers this site — every row links back to a verified source.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1">Authentication</h2>
          <p className="text-sm mt-3">
            Pass your key in the <code className="bg-gray-100 px-1">X-API-Key</code> header.
            Without a key requests still work, but with a lower rate limit.
          </p>
          <p className="text-sm mt-2">
            <Link href="/api-keys" className="underline text-green-700 font-medium">Register a key →</Link>
          </p>
          <Code>{`curl ${API_BASE_URL}/api/v1/startups \\
  -H 'X-API-Key: ifk_your_key_here'`}</Code>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1">Rate limits</h2>
          <table className="mt-3 w-full text-sm border-2 border-black">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-2">Tier</th>
                <th className="text-left p-2">Limit</th>
                <th className="text-left p-2">Headers</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="p-2">No key</td>
                <td className="p-2">30 / min</td>
                <td className="p-2 text-xs"><code>X-RateLimit-Limit</code>, <code>-Remaining</code>, <code>-Reset</code></td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-2">With key</td>
                <td className="p-2">120 / min</td>
                <td className="p-2 text-xs">Same headers; <code>429</code> on exhaustion.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1">Response envelope</h2>
          <p className="text-sm mt-3">All responses share the same shape:</p>
          <Code>{`{
  "data": <payload>,
  "meta": {
    "version": "1",
    "total": <number?>,
    "page":  <number?>,
    "limit": <number?>,
    "coverage_note": "Data complete from 2024-01-01 onwards (...)"
  }
}`}</Code>
          <p className="text-xs text-gray-600 mt-2">
            Errors return <code className="bg-gray-100 px-1">{`{ "error": { "message", "status" } }`}</code>
            with the matching HTTP status.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1">Endpoints</h2>
          <div className="space-y-10 mt-6">
            {ENDPOINTS.map((ep) => (
              <article key={ep.path} className="border-2 border-black p-5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-green-700 text-white px-2 py-0.5">{ep.method}</span>
                  <code className="font-mono text-sm">{ep.path}</code>
                </div>
                <p className="text-sm text-gray-700 mt-2">{ep.desc}</p>

                {ep.params.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Parameters</div>
                    <table className="w-full text-xs mt-2">
                      <tbody>
                        {ep.params.map((p) => (
                          <tr key={p.name} className="border-t border-gray-200">
                            <td className="py-1 pr-3 font-mono whitespace-nowrap">
                              {p.name}
                              {p.required && <span className="text-red-600 ml-0.5">*</span>}
                            </td>
                            <td className="py-1 pr-3 text-gray-500 font-mono whitespace-nowrap">{p.type}</td>
                            <td className="py-1 text-gray-700">{p.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Example request</div>
                  <Code>{ep.example.curl}</Code>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Example response</div>
                  <Code>{ep.example.response}</Code>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 mb-6 border-t-2 border-gray-200 pt-6 text-xs text-gray-500">
          Found an issue or want a new endpoint? Open an issue on the GitHub repo.
        </section>
      </div>
    </div>
  )
}
