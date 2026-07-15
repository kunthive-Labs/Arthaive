import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { DealDetail } from "@/components/deal-detail"
import { getDealById } from "@/lib/db/deals"
import { formatInrLakhs } from "@/lib/format"
import type { Deal } from "@/lib/types"

// Deal pages are the bulk of the sitemap; render them on the server (indexable,
// with per-deal metadata + OG) and cache with ISR rather than shipping the whole
// dataset to the client.
export const revalidate = 3600

interface DealPageProps {
  params: Promise<{ id: string }>
}

// The one-line headline reused across the title, JSON-LD, and OG card so a shared
// deal always reads identically wherever it surfaces.
function dealHeadline(deal: Deal): string {
  return deal.amount > 0
    ? `${deal.company} raises ${formatInrLakhs(deal.amount)} · ${deal.stage}`
    : `${deal.company} · ${deal.stage}`
}

export async function generateMetadata({ params }: DealPageProps): Promise<Metadata> {
  const { id } = await params
  const deal = await getDealById(decodeURIComponent(id))
  if (!deal) return { title: "Deal not found | Arthaive" }

  const title = dealHeadline(deal)
  const sectors = deal.sectors.slice(0, 3).join(", ")
  const description = deal.description?.trim()
    ? deal.description
    : `${deal.company}${sectors ? ` (${sectors})` : ""} raised ${
        deal.amount > 0 ? formatInrLakhs(deal.amount) : "an undisclosed amount"
      } at ${deal.stage}${deal.location ? ` in ${deal.location}` : ""}. A source-backed Indian startup funding record on Arthaive.`

  return {
    title: `${title} | Arthaive`,
    description,
    // The image is supplied by the sibling opengraph-image.tsx; leaving `images`
    // unset here lets Next attach that dynamic card automatically.
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params
  const deal = await getDealById(decodeURIComponent(id))
  if (!deal) notFound()

  // Article-style JSON-LD for funding announcements — lets deal pages appear in
  // funding-news rich snippets. Server-rendered so crawlers see it immediately.
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: dealHeadline(deal),
    datePublished: deal.date,
    dateModified: deal.date,
    about: {
      "@type": "Organization",
      name: deal.company,
      industry: deal.sectors?.[0],
      location: deal.location,
    },
    publisher: { "@type": "Organization", name: "Arthaive" },
    isBasedOn: deal.sourceUrl || undefined,
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <DealDetail deal={deal} />
    </div>
  )
}
