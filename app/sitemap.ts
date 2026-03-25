import type { MetadataRoute } from "next"
import { fundingData } from "@/data/funding-data"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ind-startup-funding.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const sectors = [...new Set(fundingData.flatMap((d) => d.sectors ?? []))]
  const dealIds = fundingData.map((d) => d.id)

  const staticPages = [
    { url: BASE_URL, changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE_URL}/analytics`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/explore`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/investors`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${BASE_URL}/live`, changeFrequency: "always" as const, priority: 0.7 },
  ]

  const sectorPages = sectors.map((sector) => ({
    url: `${BASE_URL}/sectors/${encodeURIComponent(sector.toLowerCase().replace(/\s+/g, "-"))}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const dealPages = dealIds.slice(0, 500).map((id) => ({
    url: `${BASE_URL}/deal/${encodeURIComponent(id)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [...staticPages, ...sectorPages, ...dealPages]
}
