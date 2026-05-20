import { AnalyticsClient } from "@/components/analytics-client"
import { getDeals } from "@/lib/db/deals"

export const metadata = {
  title: "Analytics | IndiaFundTrack",
  description: "Trends, sector breakdowns, city maps, and investor activity across Indian startup funding.",
}

export default async function AnalyticsPage() {
  const { deals } = await getDeals({ limit: 9999, sortBy: "date" })

  return <AnalyticsClient deals={deals} />
}
