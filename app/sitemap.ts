import type { MetadataRoute } from "next"
import { fundingData } from "@/data/funding-data"
import { listAvailablePeriods } from "@/lib/db/reports"

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://arthaive.kunthive.in"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sectors = [...new Set(fundingData.flatMap((d) => d.sectors ?? []))]
  const dealIds = fundingData.map((d) => d.id)
  const { weeks, months } = await listAvailablePeriods()

  const staticPages = [
    { url: BASE_URL, changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE_URL}/analytics`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/explore`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/reports`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${BASE_URL}/investors`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${BASE_URL}/live`, changeFrequency: "always" as const, priority: 0.7 },
    { url: `${BASE_URL}/search`, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE_URL}/api-docs`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE_URL}/api-keys`, changeFrequency: "monthly" as const, priority: 0.4 },
  ]

  const reportPages = [...weeks, ...months].map((p) => ({
    url: `${BASE_URL}/reports/${p.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }))

  const sectorPages = sectors.map((sector) => ({
    url: `${BASE_URL}/sectors/${encodeURIComponent(sector.toLowerCase().replace(/\s+/g, "-"))}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  // List every deal. The sitemap protocol allows up to 50,000 URLs per file;
  // the full dataset (~13.7k deals plus static/report/sector pages) stays well
  // under that, so there's no need to cap. Guard against ever exceeding the
  // limit if the dataset grows past it.
  const SITEMAP_MAX_URLS = 50000
  const nonDealCount =
    staticPages.length + reportPages.length + sectorPages.length
  const dealBudget = Math.max(0, SITEMAP_MAX_URLS - nonDealCount)
  const dealPages = dealIds.slice(0, dealBudget).map((id) => ({
    url: `${BASE_URL}/deal/${encodeURIComponent(id)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [...staticPages, ...reportPages, ...sectorPages, ...dealPages]
}
