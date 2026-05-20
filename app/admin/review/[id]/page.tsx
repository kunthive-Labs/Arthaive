import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ReviewForm } from "./review-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Review Item | Admin",
}

export default async function ReviewItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from("review_queue")
    .select(
      `id, suggested_company, match_confidence, status, notes, created_at,
       raw_extracted_data,
       sources!review_queue_source_id_fkey(id, title, url, publisher, raw_text_snapshot, publication_date)`
    )
    .eq("id", id)
    .single()

  if (!item) notFound()

  const extracted = (item.raw_extracted_data ?? {}) as Record<string, string>
  const source = Array.isArray(item.sources) ? item.sources[0] : item.sources
  const sourceTyped = source as {
    id?: string
    title?: string
    url?: string
    publisher?: string
    raw_text_snapshot?: string
    publication_date?: string
  } | null

  const initialFields = {
    company: item.suggested_company ?? extracted.company ?? "",
    amount: extracted.amount ?? "",
    currency: extracted.currency ?? "INR",
    round_type: extracted.round_type ?? "",
    deal_date: extracted.deal_date ?? "",
    investors: extracted.investors ?? "",
    sectors: extracted.sectors ?? "",
    location: extracted.location ?? "",
    source_url: extracted.source_url ?? sourceTyped?.url ?? "",
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/review" className="text-sm text-blue-600 hover:underline">
          ← Review Queue
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">Review Item</h1>
        <Badge variant={item.status === "pending" ? "outline" : "default"}>
          {item.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: source context */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Source Metadata</h2>
            {sourceTyped ? (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs uppercase tracking-wide">Title</dt>
                  <dd className="font-medium">{sourceTyped.title ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs uppercase tracking-wide">Publisher</dt>
                  <dd>{sourceTyped.publisher ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs uppercase tracking-wide">Published</dt>
                  <dd>
                    {sourceTyped.publication_date
                      ? new Date(sourceTyped.publication_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
                {sourceTyped.url && (
                  <div>
                    <dt className="text-gray-500 text-xs uppercase tracking-wide">URL</dt>
                    <dd>
                      <a
                        href={sourceTyped.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {sourceTyped.url}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-400">No source attached</p>
            )}
          </div>

          {sourceTyped?.raw_text_snapshot && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Article Snippet</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-20">
                {sourceTyped.raw_text_snapshot}
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Raw Extracted Data</h2>
            <pre className="text-xs text-gray-600 overflow-x-auto bg-gray-50 rounded p-3">
              {JSON.stringify(item.raw_extracted_data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right panel: editable form */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Edit & Review</h2>
          <ReviewForm id={item.id} initialFields={initialFields} />
        </div>
      </div>
    </div>
  )
}
