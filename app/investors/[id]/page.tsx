import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getInvestorBySlug } from "@/lib/db/investors"
import { SectionHeader } from "@/components/section-header"
import { StatCard } from "@/components/stat-card"
import { BackButton } from "@/components/back-button"

// The route segment is `[id]`, but components/investor-card.tsx links to
// `/investors/${investor.slug}`, so the param is a SLUG. This page used to
// decode it as an investor *name* and match it against the static
// `fundingData` array — two independent bugs: the slug never equalled the name
// ("accel-partners" vs "Accel Partners"), and the static array is now an
// intentionally empty placeholder, so every profile answered 404.
// `getInvestorBySlug` is the accessor the /api/investors/[id] routes already
// use, and it resolves by slug against Supabase.

interface Props {
  params: Promise<{ id: string }>
}

// The page body and generateMetadata both need the investor; cache() collapses
// them into a single query per request.
const loadInvestor = cache(async (slug: string) => getInvestorBySlug(slug))

/** Deals come back as raw PostgREST rows, where the date column is `deal_date`. */
function dealDate(deal: unknown): number {
  const row = deal as Record<string, unknown>
  const raw = (row.date ?? row.deal_date) as string | undefined
  const parsed = raw ? new Date(raw).getTime() : Number.NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const investor = await loadInvestor(decodeURIComponent(id))
  return { title: `${investor?.name ?? decodeURIComponent(id)} | Arthaive` }
}

export default async function InvestorProfilePage({ params }: Props) {
  const { id } = await params
  const investor = await loadInvestor(decodeURIComponent(id))
  if (!investor) notFound()

  const mostRecent = [...(investor.deals ?? [])].sort((a, b) => dealDate(b) - dealDate(a))[0]

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <BackButton fallback="/investors" />
      <SectionHeader title={investor.name} subtitle={`${investor.dealCount} deals tracked`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <StatCard value={investor.dealCount} label="Total Deals" accent />
        <StatCard value={investor.sectors.length} label="Sectors" />
        <StatCard value={mostRecent?.stage ?? "-"} label="Recent Stage" />
        <StatCard value={mostRecent?.location ?? "-"} label="Top City" />
      </div>
    </main>
  )
}
