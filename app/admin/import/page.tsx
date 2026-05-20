"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface ImportResult {
  queued: number
  errors?: string[]
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file ? file.name : null)
    setResult(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Import failed")
      } else {
        setResult(json as ImportResult)
        if (fileRef.current) fileRef.current.value = ""
        setFileName(null)
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bulk CSV Import</h1>

      <div className="bg-white rounded-xl border p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Upload CSV</h2>
            <p className="text-sm text-gray-500 mb-4">
              Required columns:{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">
                company, amount, currency, round_type, deal_date, investors, sectors, location, source_url
              </code>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="csv-file">CSV File</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                ref={fileRef}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              {fileName && (
                <p className="text-xs text-gray-500">Selected: {fileName}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
              <p className="text-sm text-green-700 font-medium">
                Successfully queued {result.queued} deals for review
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-yellow-700 font-medium">Warnings ({result.errors.length} rows had issues):</p>
                  <ul className="mt-1 space-y-0.5">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-xs text-yellow-700">• {err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-xs text-yellow-600">... and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading || !fileName}>
            {loading ? "Importing..." : "Import CSV"}
          </Button>
        </form>
      </div>

      {/* CSV format guide */}
      <div className="mt-8 bg-gray-50 rounded-xl border p-5 max-w-xl">
        <h3 className="font-semibold text-gray-900 mb-3">CSV Format</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b">
                <th className="py-1.5 pr-4 text-left font-semibold text-gray-700">Column</th>
                <th className="py-1.5 text-left font-semibold text-gray-700">Example</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {[
                ["company", "Razorpay"],
                ["amount", "500"],
                ["currency", "USD"],
                ["round_type", "Series B"],
                ["deal_date", "2024-03-15"],
                ["investors", "Sequoia, Accel"],
                ["sectors", "Fintech, Payments"],
                ["location", "Bengaluru"],
                ["source_url", "https://example.com/article"],
              ].map(([col, ex]) => (
                <tr key={col} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 font-mono">{col}</td>
                  <td className="py-1.5 text-gray-500">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
