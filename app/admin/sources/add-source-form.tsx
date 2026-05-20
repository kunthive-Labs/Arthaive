"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddSourceForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    url: "",
    title: "",
    publisher: "",
    reliability_tier: "tier_2",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleChange(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to add source")
      } else {
        setSuccess("Source added and queued for review")
        setForm({ url: "", title: "", publisher: "", reliability_tier: "tier_2" })
        router.refresh()
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold text-gray-900">Add New Source</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="url">URL *</Label>
          <Input
            id="url"
            type="url"
            value={form.url}
            onChange={(e) => handleChange("url", e.target.value)}
            placeholder="https://..."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Article title"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="publisher">Publisher</Label>
          <Input
            id="publisher"
            value={form.publisher}
            onChange={(e) => handleChange("publisher", e.target.value)}
            placeholder="e.g. Entrackr, Inc42"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tier">Reliability Tier</Label>
          <select
            id="tier"
            value={form.reliability_tier}
            onChange={(e) => handleChange("reliability_tier", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="tier_1">Tier 1 (High)</option>
            <option value="tier_2">Tier 2 (Medium)</option>
            <option value="tier_3">Tier 3 (Low)</option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={loading || !form.url.trim()}>
        {loading ? "Adding..." : "Add Source"}
      </Button>
    </form>
  )
}
