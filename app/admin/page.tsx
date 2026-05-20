import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin Dashboard | IndiaFundTrack",
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    partial: "secondary",
    failed: "destructive",
  }
  return (
    <Badge variant={variants[status] ?? "outline"}>
      {status}
    </Badge>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: pendingCount },
    { count: verifiedCount },
    { count: sourcesCount },
    { data: pipelineJobs },
  ] = await Promise.all([
    supabase
      .from("review_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("record_status", "verified"),
    supabase
      .from("sources")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("pipeline_jobs")
      .select("id, run_at, source_feed, articles_fetched, records_extracted, run_status")
      .order("run_at", { ascending: false })
      .limit(5),
  ])

  const lastRun = pipelineJobs?.[0]

  const stats = [
    { label: "Pending Reviews", value: pendingCount ?? 0, href: "/admin/review" },
    { label: "Verified Deals", value: verifiedCount ?? 0, href: "/admin/entities" },
    { label: "Total Sources", value: sourcesCount ?? 0, href: "/admin/sources" },
    {
      label: "Last Pipeline Run",
      value: lastRun
        ? new Date(lastRun.run_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "None",
      href: "/admin/pipeline",
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent pipeline jobs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Pipeline Jobs</h2>
          <Link href="/admin/pipeline" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Run At</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Feed</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Fetched</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Extracted</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {pipelineJobs && pipelineJobs.length > 0 ? (
                pipelineJobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(job.run_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {job.source_feed ?? "—"}
                    </td>
                    <td className="px-4 py-3">{job.articles_fetched}</td>
                    <td className="px-4 py-3">{job.records_extracted}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.run_status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No pipeline jobs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick nav */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: "/admin/review", label: "Review Queue", desc: "Approve or reject pending records" },
            { href: "/admin/entities", label: "Entity Manager", desc: "Manage company & investor aliases" },
            { href: "/admin/sources", label: "Source Manager", desc: "Add and manage news sources" },
            { href: "/admin/pipeline", label: "Pipeline Logs", desc: "Monitor automated runs" },
            { href: "/admin/import", label: "Bulk Import", desc: "Upload a CSV of deals" },
            { href: "/admin/export", label: "Export Data", desc: "Download verified deals" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 bg-white rounded-xl border hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
