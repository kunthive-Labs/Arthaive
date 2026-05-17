import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BackButton } from "@/components/back-button"

interface Props { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `${params.slug} Funding | IndiaFundTrack` }
}

export default function SectorDetailPage({ params }: Props) {
  if (!params.slug) notFound()
  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <BackButton fallback="/sectors" />
      <h1 className="text-3xl font-bold capitalize mb-6">{params.slug}</h1>
    </main>
  )
}
