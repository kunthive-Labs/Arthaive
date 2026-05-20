"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function ExportPage() {
  const [loading, setLoading] = useState<"csv" | "json" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(format: "csv" | "json") {
    setLoading(format)
    setError(null)

    try {
      const res = await fetch(`/api/admin/export?format=${format}`)

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "Export failed")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `deals-export-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Export Data</h1>

      <div className="bg-white rounded-xl border p-6 max-w-md">
        <h2 className="font-semibold text-gray-900 mb-2">Download Verified Deals</h2>
        <p className="text-sm text-gray-500 mb-6">
          Export all verified deals from the database. Includes company, amount, stage, sectors,
          investors, location, and source URL.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => handleExport("csv")}
            disabled={loading !== null}
            variant="default"
          >
            {loading === "csv" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            onClick={() => handleExport("json")}
            disabled={loading !== null}
            variant="secondary"
          >
            {loading === "json" ? "Exporting..." : "Export JSON"}
          </Button>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-xl border p-5 max-w-md">
        <h3 className="font-semibold text-gray-900 mb-2">Export Fields</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>id, company</li>
          <li>amount_inr, amount_usd</li>
          <li>stage (round type)</li>
          <li>deal_date</li>
          <li>sectors (array)</li>
          <li>investors (array)</li>
          <li>location</li>
          <li>source_url</li>
          <li>record_status</li>
        </ul>
      </div>
    </div>
  )
}
