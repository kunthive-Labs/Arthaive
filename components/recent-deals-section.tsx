import Link from "next/link"
import { getDeals } from "@/lib/db/deals"
import { DealCard } from "./deal-card"

// Server component: fetches the six most-recent rounds on the server instead of
// importing the whole dataset into the client. (It used to `fundingData.slice(0, 6)`,
// which shipped the 7.9MB file to the browser just to show six cards.)
export async function RecentDealsSection() {
  const { deals } = await getDeals({ limit: 6, sortBy: "date" })

  return (
    <section className="mb-16">
      <div className="flex justify-between items-end mb-8 pb-6 border-b-4 border-black">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">RECENT DEALS</h2>
        <Link href="/explore" className="font-bold text-sm text-green-700 hover:underline">
          VIEW ALL →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  )
}
