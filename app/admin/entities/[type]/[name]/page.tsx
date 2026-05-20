import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AliasManager } from "./alias-manager"

export const dynamic = "force-dynamic"

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ type: string; name: string }>
}) {
  const { type, name } = await params

  if (type !== "startup" && type !== "investor") {
    notFound()
  }

  const canonical = decodeURIComponent(name)
  const supabase = await createClient()

  // Fetch aliases
  let aliases: Array<{ id: string; alias_name: string }> = []

  if (type === "startup") {
    const { data } = await supabase
      .from("startup_aliases")
      .select("id, alias_name")
      .eq("company", canonical)
      .order("alias_name")
    aliases = data ?? []
  } else {
    const { data } = await supabase
      .from("investor_aliases")
      .select("id, alias_name")
      .eq("investor_name", canonical)
      .order("alias_name")
    aliases = data ?? []
  }

  // Fetch related deals
  let deals: Array<{ id: string; company: string; stage: string; deal_date: string; amount_inr: number }> = []

  if (type === "startup") {
    const { data } = await supabase
      .from("deals")
      .select("id, company, stage, deal_date, amount_inr")
      .eq("company", canonical)
      .eq("record_status", "verified")
      .order("deal_date", { ascending: false })
      .limit(20)
    deals = data ?? []
  } else {
    const { data } = await supabase
      .from("deals")
      .select("id, company, stage, deal_date, amount_inr")
      .contains("investors", [canonical])
      .eq("record_status", "verified")
      .order("deal_date", { ascending: false })
      .limit(20)
    deals = data ?? []
  }

  const backTab = type === "startup" ? "startups" : "investors"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/entities?tab=${backTab}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Entities
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold capitalize">{type}: {canonical}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alias manager */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Alias Management</h2>
          <AliasManager type={type} canonical={canonical} aliases={aliases} />
        </div>

        {/* Related deals */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Related Deals ({deals.length})
          </h2>
          {deals.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold text-gray-600">Company</th>
                  <th className="pb-2 font-semibold text-gray-600">Stage</th>
                  <th className="pb-2 font-semibold text-gray-600">Date</th>
                  <th className="pb-2 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">{deal.company}</td>
                    <td className="py-2 pr-2 text-gray-600">{deal.stage}</td>
                    <td className="py-2 pr-2 text-gray-600 text-xs">
                      {new Date(deal.deal_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 text-gray-600">
                      {deal.amount_inr > 0 ? `₹${(deal.amount_inr / 100).toFixed(0)}Cr` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">No deals found</p>
          )}
        </div>
      </div>
    </div>
  )
}
