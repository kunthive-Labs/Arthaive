import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { BackButton } from "@/components/back-button"
import { StatCard } from "@/components/stat-card"
import { DealCard } from "@/components/deal-card"
import { EmptyState } from "@/components/empty-state"
import { FundingTrendLine } from "@/components/charts/funding-trend-line"
import { StageFunnel } from "@/components/charts/stage-funnel"
import { TopDealsTable } from "@/components/charts/top-deals-table"
import { getSectorBySlug } from "@/lib/db/sectors"
import { getDeals } from "@/lib/db/deals"
import { formatFundingAmount } from "@/lib/utils"
import type { FundingDeal } from "@/data/funding-data"

export const revalidate = 86400 // sector aggregates move slowly

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)
  if (!sector) return { title: "Sector not found | Arthaive" }

  const title = `${sector.name} startup funding in India`
  const description = `${sector.dealCount.toLocaleString("en-IN")} ${sector.name} funding rounds totalling ${formatFundingAmount(
    sector.totalFunding
  )} across India — explore the timeline, stage mix, and top-funded companies on Arthaive.`

  return {
    title: `${title} | Arthaive`,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function SectorDetailPage({ params }: Props) {
  const { slug } = await params
  const sector = await getSectorBySlug(slug)
  if (!sector) notFound()

  // The sector's rounds, newest first. Bounded so a huge vertical can't blow up
  // the payload; plenty for the timeline / stage mix / top-deals views.
  const { deals } = await getDeals({
    sectors: [sector.name],
    limit: 500,
    sortBy: "date",
  })

  // Charts type their prop as FundingDeal; the DB `Deal` is structurally
  // compatible (same cast the analytics page uses).
  const fd = deals as unknown as FundingDeal[]
  const exploreLink = `/explore?sector=${encodeURIComponent(sector.name)}`
  const recentDeals = deals.slice(0, 9)

  return (
    <div className="min-h-screen bg-[#EFEDE3]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <BackButton fallback="/sectors" />

        {/* Masthead */}
        <header className="mt-6 neo-border neo-shadow bg-white p-6 md:p-8">
          <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-green-700">
            <span className="inline-block h-2.5 w-2.5 bg-[#FF5A1F]" aria-hidden />
            Sector
          </p>
          <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tighter leading-none">
            {sector.name}
          </h1>
          <p className="mt-4 max-w-2xl text-gray-600">
            {sector.dealCount.toLocaleString("en-IN")} tracked funding rounds across
            India, from{" "}
            {sector.topStages.length > 0
              ? `${sector.topStages.slice(0, 3).join(", ")} and beyond`
              : "seed to growth"}
            .
          </p>
          <Link
            href={exploreLink}
            className="mt-6 inline-flex items-center gap-2 neo-border neo-shadow bg-green-700 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-green-800"
          >
            Explore all {sector.name} deals
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        {/* Stat ledger */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={sector.dealCount.toLocaleString("en-IN")} label="Deals tracked" />
          <StatCard value={formatFundingAmount(sector.totalFunding)} label="Total funding" accent />
          <StatCard value={formatFundingAmount(sector.avgDealSize)} label="Avg deal size" />
          <StatCard
            value={sector.topCities[0] ?? "—"}
            label="Top city"
            sublabel={sector.topCities.slice(1, 3).join(" · ") || undefined}
          />
        </div>

        {deals.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No deals yet"
              description={`We don't have any funding rounds recorded for ${sector.name} right now. Check back as new deals are ingested.`}
            />
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {/* Funding timeline */}
            <section className="neo-border neo-shadow bg-white p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-4">
                Funding over time
              </h2>
              <FundingTrendLine deals={fd} sourceLink={exploreLink} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage mix */}
              <section className="neo-border neo-shadow bg-white p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-4">
                  Deals by stage
                </h2>
                <StageFunnel deals={fd} sourceLink={exploreLink} />
              </section>

              {/* Top deals */}
              <section className="neo-border neo-shadow bg-white p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 mb-4">
                  Largest rounds
                </h2>
                <TopDealsTable deals={fd} topN={10} />
              </section>
            </div>

            {/* Recent deals grid */}
            <section>
              <div className="flex items-end justify-between mb-6 pb-4 border-b-4 border-black">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Recent {sector.name} deals
                </h2>
                <Link
                  href={exploreLink}
                  className="font-bold text-sm text-green-700 hover:underline whitespace-nowrap"
                >
                  VIEW ALL →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
