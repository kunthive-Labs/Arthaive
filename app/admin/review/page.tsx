import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Review Queue | Admin",
}

const PAGE_SIZE = 20

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null || confidence === undefined) {
    return <Badge variant="outline">Unknown</Badge>
  }
  const pct = Math.round(confidence * 100)
  if (pct >= 80) return <Badge variant="default">{pct}%</Badge>
  if (pct >= 60) return <Badge variant="secondary">{pct}%</Badge>
  return <Badge variant="destructive">{pct}%</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    approved: "default",
    rejected: "destructive",
    needs_more_info: "secondary",
    merged: "secondary",
  }
  return <Badge variant={variants[status] ?? "outline"}>{status.replace(/_/g, " ")}</Badge>
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: items, count } = await supabase
    .from("review_queue")
    .select(
      `id, suggested_company, match_confidence, status, created_at,
       raw_extracted_data,
       sources!review_queue_source_id_fkey(title, url, publisher)`,
      { count: "exact" }
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <span className="text-sm text-gray-500">{count ?? 0} pending items</span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Source</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Company</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Amount</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Stage</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Confidence</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item) => {
                const extracted = (item.raw_extracted_data ?? {}) as Record<string, string>
                const source = Array.isArray(item.sources) ? item.sources[0] : item.sources
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-xs">
                      {source ? (
                        <a
                          href={(source as { url?: string }).url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block text-xs"
                        >
                          {(source as { title?: string; publisher?: string }).title ??
                            (source as { publisher?: string }).publisher ??
                            "Unknown source"}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">No source</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.suggested_company ?? extracted.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {extracted.amount ? `${extracted.currency ?? "INR"} ${extracted.amount}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{extracted.round_type ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {extracted.deal_date
                        ? new Date(extracted.deal_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge confidence={item.match_confidence} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/review/${item.id}`}
                        className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No pending items in the review queue
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/review?page=${page - 1}`}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/review?page=${page + 1}`}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
