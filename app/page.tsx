import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/server"
import { getDeals } from "@/lib/db/deals"
import { formatInrLakhs } from "@/lib/format"
import { Landing, type TickerDeal } from "@/components/landing"

export const metadata = {
  title: "Arthaive — The Indian Startup Funding Ledger",
  description:
    "The continuously-maintained, verified record of Indian startup funding — 14,700+ deals from 2005 to today. Browse, filter and analyze for free; sign in to save deals and build watchlists.",
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Fully gated: signed-in members go straight to their dashboard; everyone
  // else meets the gate.
  const user = await getUser()
  if (user) redirect("/dashboard")

  const params = await searchParams

  // Most recent rounds, as the live tape on the gate. Kept server-side so the
  // public entry ships a tiny client bundle, not the full dataset.
  const { deals, total } = await getDeals({ limit: 24, sortBy: "date" })
  const tickerDeals: TickerDeal[] = deals.map((d) => ({
      company: d.company,
      amountCr: formatInrLakhs(d.amount),
      stage: d.stage,
    }))

  return (
    <Landing
      tickerDeals={tickerDeals}
      dealCount={total}
      authError={params.error === "auth"}
    />
  )
}
