import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pipeline Logs | Admin",
}

function RunStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    partial: "secondary",
    failed: "destructive",
  }
  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>
}

export default async function PipelineLogsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from("pipeline_jobs")
    .select(
      "id, run_at, source_feed, articles_fetched, articles_filtered, records_extracted, records_auto_approved, records_flagged, run_status, error_log"
    )
    .order("run_at", { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipeline Logs</h1>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Run At</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Feed</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Fetched</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Filtered</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Extracted</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Auto-Approved</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Flagged</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <>
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(job.run_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {job.source_feed ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{job.articles_fetched}</td>
                    <td className="px-4 py-3 text-center">{job.articles_filtered}</td>
                    <td className="px-4 py-3 text-center">{job.records_extracted}</td>
                    <td className="px-4 py-3 text-center">{job.records_auto_approved}</td>
                    <td className="px-4 py-3 text-center">{job.records_flagged}</td>
                    <td className="px-4 py-3">
                      <RunStatusBadge status={job.run_status} />
                    </td>
                  </tr>
                  {job.run_status === "failed" && job.error_log && (
                    <tr key={`${job.id}-error`} className="border-b bg-red-50">
                      <td colSpan={8} className="px-4 py-3">
                        <details>
                          <summary className="text-sm text-red-700 font-medium cursor-pointer">
                            Error Log
                          </summary>
                          <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap bg-red-100 p-3 rounded overflow-x-auto">
                            {job.error_log}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  )}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No pipeline jobs recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
