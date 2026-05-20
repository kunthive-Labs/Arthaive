import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Entity Manager | Admin",
}

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === "investors" ? "investors" : "startups"

  const supabase = await createClient()

  let startups: Array<{ company: string; deal_count: number; aliases: string[] }> = []
  let investors: Array<{ investor_name: string; deal_count: number; aliases: string[] }> = []

  if (activeTab === "startups") {
    const { data: dealGroups } = await supabase
      .from("deals")
      .select("company")
      .eq("record_status", "verified")
      .limit(5000)

    const companyCounts: Record<string, number> = {}
    for (const row of dealGroups ?? []) {
      companyCounts[row.company] = (companyCounts[row.company] ?? 0) + 1
    }

    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([company, deal_count]) => ({ company, deal_count }))

    const { data: aliasRows } = await supabase
      .from("startup_aliases")
      .select("company, alias_name")
      .in(
        "company",
        topCompanies.map((c) => c.company)
      )

    const aliasMap: Record<string, string[]> = {}
    for (const row of aliasRows ?? []) {
      aliasMap[row.company] = [...(aliasMap[row.company] ?? []), row.alias_name]
    }

    startups = topCompanies.map((c) => ({
      ...c,
      aliases: aliasMap[c.company] ?? [],
    }))
  } else {
    // Build investor counts from deals
    const { data: dealRows } = await supabase
      .from("deals")
      .select("investors")
      .eq("record_status", "verified")
      .limit(5000)

    const investorCounts: Record<string, number> = {}
    for (const row of dealRows ?? []) {
      for (const inv of row.investors ?? []) {
        if (inv) investorCounts[inv] = (investorCounts[inv] ?? 0) + 1
      }
    }

    const topInvestors = Object.entries(investorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([investor_name, deal_count]) => ({ investor_name, deal_count }))

    const { data: aliasRows } = await supabase
      .from("investor_aliases")
      .select("investor_name, alias_name")
      .in(
        "investor_name",
        topInvestors.map((i) => i.investor_name)
      )

    const aliasMap: Record<string, string[]> = {}
    for (const row of aliasRows ?? []) {
      aliasMap[row.investor_name] = [...(aliasMap[row.investor_name] ?? []), row.alias_name]
    }

    investors = topInvestors.map((i) => ({
      ...i,
      aliases: aliasMap[i.investor_name] ?? [],
    }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Entity Manager</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["startups", "investors"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/entities?tab=${t}`}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === t
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* Startups table */}
      {activeTab === "startups" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Company</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Deal Count</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Aliases</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {startups.map((s) => (
                <tr key={s.company} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.company}</td>
                  <td className="px-4 py-3 text-gray-600">{s.deal_count}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.aliases.length > 0 ? s.aliases.join(", ") : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/entities/startup/${encodeURIComponent(s.company)}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
              {startups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Investors table */}
      {activeTab === "investors" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Investor</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Deal Count</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Aliases</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => (
                <tr key={inv.investor_name} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.investor_name}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.deal_count}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {inv.aliases.length > 0 ? inv.aliases.join(", ") : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/entities/investor/${encodeURIComponent(inv.investor_name)}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
              {investors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    No investors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
