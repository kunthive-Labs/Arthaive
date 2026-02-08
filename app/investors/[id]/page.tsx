import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fundingData } from "@/data/funding-data"
import { SectionHeader } from "@/components/section-header"
import { StatCard } from "@/components/stat-card"

interface Props { params: { id: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `${decodeURIComponent(params.id)} | IndiaFundTrack` }
}

export default function InvestorProfilePage({ params }: Props) {
  const name = decodeURIComponent(params.id)
  const deals = fundingData.filter(d => d.investors.includes(name))
  if (!deals.length) notFound()

  const total = deals.reduce((s, d) => s + d.amount, 0)
  const sectors = [...new Set(deals.flatMap(d => d.sectors))]

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <SectionHeader title={name} subtitle={`${deals.length} deals tracked`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <StatCard value={deals.length} label="Total Deals" accent />
        <StatCard value={sectors.length} label="Sectors" />
        <StatCard value={deals[0]?.stage ?? "-"} label="Recent Stage" />
        <StatCard value={deals[0]?.location ?? "-"} label="Top City" />
      </div>
    </main>
  )
}
