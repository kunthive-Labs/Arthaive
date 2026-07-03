import { AnalyticsClient } from "@/components/analytics-client"
import { getDeals } from "@/lib/db/deals"
import { getCoverageRange } from "@/lib/db/analytics"

export const metadata = {
  title: "Analytics | Arthaive",
  description: "Trends, sector breakdowns, city maps, and investor activity across Indian startup funding.",
}

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const [{ deals }, coverage] = await Promise.all([
    getDeals({ limit: 9999, sortBy: "date" }),
    getCoverageRange(),
  ])

  return <AnalyticsClient deals={deals} coverage={coverage} />
}
