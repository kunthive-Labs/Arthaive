import Link from "next/link"
import { Header } from "@/components/header"
import { CoverageNotice } from "@/components/coverage-notice"
import { listAvailablePeriods, type ReportPeriodSummary } from "@/lib/db/reports"
import { getCoverageRange } from "@/lib/db/analytics"
import { formatCurrency } from "@/lib/format"

export const metadata = {
  title: "Funding Reports | IndiaFundTrack",
  description: "Weekly and monthly digests of Indian startup funding, generated from verified records.",
}

function PeriodCard({ period }: { period: ReportPeriodSummary }) {
  return (
    <Link
      href={`/reports/${period.id}`}
      className="block border-2 border-black p-4 hover:bg-gray-50 transition"
    >
      <div className="font-bold text-sm">{period.label}</div>
      <div className="text-xs text-gray-500 mt-1">{period.id}</div>
      <div className="mt-3 flex items-baseline gap-4">
        <span className="text-lg font-bold">{period.dealCount}</span>
        <span className="text-xs text-gray-500">deals</span>
        <span className="text-sm font-semibold ml-auto">{formatCurrency(period.totalFunding)}</span>
      </div>
    </Link>
  )
}

export default async function ReportsPage() {
  const [{ weeks, months }, coverage] = await Promise.all([
    listAvailablePeriods(),
    getCoverageRange(),
  ])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="pb-6 border-b-4 border-black mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">REPORTS</h1>
          <p className="text-gray-600 mt-2">
            Weekly and monthly funding digests, generated from verified records.
          </p>
        </div>

        <CoverageNotice
          earliest={coverage.earliest}
          latest={coverage.latest}
          total={coverage.total}
          className="mb-8"
        />

        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Weekly</h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-gray-500">No weekly reports available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {weeks.map((w) => (
                <PeriodCard key={w.id} period={w} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Monthly</h2>
          {months.length === 0 ? (
            <p className="text-sm text-gray-500">No monthly reports available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {months.map((m) => (
                <PeriodCard key={m.id} period={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
