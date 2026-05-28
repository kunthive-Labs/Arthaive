import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { CoverageNotice } from "@/components/coverage-notice"
import { SectorBarChart } from "@/components/charts/sector-bar-chart"
import { StageFunnel } from "@/components/charts/stage-funnel"
import { getReport } from "@/lib/db/reports"
import { getCoverageRange } from "@/lib/db/analytics"
import { generateTrendSummary } from "@/lib/ai/trend-summary"
import { AISection } from "@/components/ai-label"
import { formatCurrency } from "@/lib/format"
import type { FundingDeal } from "@/data/funding-data"

export async function generateMetadata({
  params,
}: {
  params: { period: string }
}): Promise<Metadata> {
  const report = await getReport(params.period)
  if (!report) return { title: "Report not found | IndiaFundTrack" }
  return {
    title: `India Startup Funding — ${report.period.label} | IndiaFundTrack`,
    description: `${report.totalDeals} deals · ${formatCurrency(report.totalFunding)} raised during ${report.period.label}.`,
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-black p-4">
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default async function ReportPage({ params }: { params: { period: string } }) {
  const [report, coverage] = await Promise.all([
    getReport(params.period),
    getCoverageRange(),
  ])

  if (!report) notFound()

  // Trend summary is best-effort — generation failures (no key, API error) just hide the section.
  const aiSummary = report.totalDeals > 0 ? await generateTrendSummary(report) : null

  const fd = report.deals as unknown as FundingDeal[]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Link href="/reports" className="text-sm text-gray-500 hover:text-green-700">
          ← All reports
        </Link>

        <div className="pb-6 border-b-4 border-black mb-6 mt-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {report.period.type === "week" ? "Weekly digest" : "Monthly digest"}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
            India Startup Funding — {report.period.label}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {report.period.start} to {report.period.end}
          </p>
        </div>

        {report.totalDeals === 0 ? (
          <div className="border-2 border-black p-8 text-center text-gray-500">
            No verified deals recorded for this period.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <StatCard label="Capital deployed" value={formatCurrency(report.totalFunding)} />
              <StatCard label="Deals" value={report.totalDeals.toLocaleString()} />
              <StatCard label="Disclosed deals" value={report.disclosedDeals.toLocaleString()} />
              <StatCard label="Startups funded" value={report.newStartups.toLocaleString()} />
            </div>

            {aiSummary && (
              <div className="mb-8">
                <AISection>
                  {aiSummary.summary.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>{para}</p>
                  ))}
                  {aiSummary.cached && (
                    <p className="mt-3 text-xs text-gray-500">Cached summary.</p>
                  )}
                </AISection>
              </div>
            )}

            {report.topDeals.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4">Top deals</h2>
                <div className="space-y-2">
                  {report.topDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deal/${deal.id}`}
                      className="flex items-center justify-between border-2 border-black p-3 hover:bg-gray-50 transition"
                    >
                      <div>
                        <div className="font-bold">{deal.company}</div>
                        <div className="text-xs text-gray-500">
                          {deal.stage}
                          {deal.sectors[0] ? ` · ${deal.sectors[0]}` : ""}
                          {deal.location ? ` · ${deal.location}` : ""}
                        </div>
                      </div>
                      <div className="font-bold">{formatCurrency(deal.amount)}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div>
                <h2 className="text-lg font-semibold mb-4">By sector</h2>
                <SectorBarChart deals={fd} topN={8} />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-4">By stage</h2>
                <StageFunnel deals={fd} />
              </div>
            </div>

            {report.topInvestors.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4">Most active investors</h2>
                <div className="flex flex-wrap gap-2">
                  {report.topInvestors.map((inv) => (
                    <span key={inv.name} className="border-2 border-black px-3 py-1 text-sm">
                      {inv.name}
                      <span className="text-gray-500 ml-2">{inv.dealCount}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">All deals this period ({report.deals.length})</h2>
              <div className="overflow-x-auto border-2 border-black">
                <table className="w-full text-sm">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="text-left p-2">Company</th>
                      <th className="text-left p-2">Stage</th>
                      <th className="text-left p-2">Sector</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.deals.map((deal) => (
                      <tr key={deal.id} className="border-t border-gray-200">
                        <td className="p-2 font-medium">
                          <Link href={`/deal/${deal.id}`} className="hover:text-green-700">
                            {deal.company}
                          </Link>
                        </td>
                        <td className="p-2 text-gray-600">{deal.stage}</td>
                        <td className="p-2 text-gray-600">{deal.sectors[0] || "—"}</td>
                        <td className="p-2 text-right font-medium">
                          {deal.amount > 0 ? formatCurrency(deal.amount) : "—"}
                        </td>
                        <td className="p-2">
                          {deal.sourceUrl ? (
                            <a
                              href={deal.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline"
                            >
                              link ↗
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <CoverageNotice
          earliest={coverage.earliest}
          latest={coverage.latest}
          total={coverage.total}
          className="mt-8"
        />
      </div>
    </div>
  )
}
