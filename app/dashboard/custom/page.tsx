import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardBuilder } from "@/components/dashboard-builder/dashboard-builder"
import { getUser } from "@/lib/supabase/session"
import { listDashboards } from "@/lib/supabase/dashboards"
import { getDeals } from "@/lib/db/deals"
import type { FundingDeal } from "@/data/funding-data"

export const metadata = {
  title: "My Dashboards | Arthaive",
  description: "Build and customize your own analytics dashboards over India's startup funding data.",
}

export default async function CustomDashboardPage() {
  const user = await getUser()
  if (!user) redirect("/")

  const [{ deals }, dashboards] = await Promise.all([
    getDeals({ limit: 9999, sortBy: "date" }),
    listDashboards(user.id),
  ])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F6F5F1]">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#1A5D1A]">
            Personal Workspace
          </div>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-tighter md:text-6xl">
            MY DASHBOARDS
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Compose your own analytics — drag, resize, and filter widgets into views that are
            saved privately to your account.
          </p>
        </header>

        <DashboardBuilder
          initialDeals={deals as unknown as FundingDeal[]}
          initialDashboards={dashboards}
        />
      </div>
    </div>
  )
}
