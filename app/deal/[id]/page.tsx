"use client"

import { Header } from "@/components/header"
import { DealDetail } from "@/components/deal-detail"
import { fundingData } from "@/data/funding-data"
import { useParams } from "next/navigation"

export default function DealPage() {
  const params = useParams()
  const raw = Array.isArray(params?.id) ? params.id[0] : params?.id
  const id = raw ? decodeURIComponent(raw) : ""
  const deal = fundingData.find((d) => d.id === id)

  if (!deal) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Deal Not Found</h1>
          <p className="text-gray-600">The deal you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <DealDetail deal={deal} />
    </div>
  )
}
