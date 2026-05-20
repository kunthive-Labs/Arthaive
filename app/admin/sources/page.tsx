import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AddSourceForm } from "./add-source-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Source Manager | Admin",
}

function TierBadge({ tier }: { tier: string }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    tier_1: "default",
    tier_2: "secondary",
    tier_3: "outline",
  }
  const labels: Record<string, string> = {
    tier_1: "Tier 1",
    tier_2: "Tier 2",
    tier_3: "Tier 3",
  }
  return <Badge variant={variants[tier] ?? "outline"}>{labels[tier] ?? tier}</Badge>
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>
}) {
  const { tier } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("sources")
    .select("id, title, url, publisher, reliability_tier, extraction_method, publication_date, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (tier && ["tier_1", "tier_2", "tier_3"].includes(tier)) {
    query = query.eq("reliability_tier", tier)
  }

  const { data: sources } = await query

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Source Manager</h1>

      {/* Filter by tier */}
      <div className="flex gap-2 mb-4">
        <span className="text-sm text-gray-500 self-center">Filter:</span>
        {(["", "tier_1", "tier_2", "tier_3"] as const).map((t) => (
          <Link
            key={t || "all"}
            href={t ? `/admin/sources?tier=${t}` : "/admin/sources"}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              (tier ?? "") === t
                ? "bg-black text-white border-black"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "" ? "All" : t === "tier_1" ? "Tier 1" : t === "tier_2" ? "Tier 2" : "Tier 3"}
          </Link>
        ))}
      </div>

      {/* Sources table */}
      <div className="bg-white rounded-xl border overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Title</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Publisher</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Tier</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Method</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Published</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Added</th>
            </tr>
          </thead>
          <tbody>
            {sources && sources.length > 0 ? (
              sources.map((source) => (
                <tr key={source.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate block"
                    >
                      {source.title ?? source.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{source.publisher ?? "—"}</td>
                  <td className="px-4 py-3">
                    <TierBadge tier={source.reliability_tier} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {source.extraction_method}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {source.publication_date
                      ? new Date(source.publication_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(source.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No sources found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add source form */}
      <div className="bg-white rounded-xl border p-5">
        <AddSourceForm />
      </div>
    </div>
  )
}
