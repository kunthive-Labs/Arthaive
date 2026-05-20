"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ReviewFormProps {
  id: string
  initialFields: {
    company: string
    amount: string
    currency: string
    round_type: string
    deal_date: string
    investors: string
    sectors: string
    location: string
    source_url: string
  }
}

export function ReviewForm({ id, initialFields }: ReviewFormProps) {
  const router = useRouter()
  const [fields, setFields] = useState(initialFields)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleChange(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAction(action: "approve" | "reject" | "needs_more_info") {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/review/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, fields, notes }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Something went wrong")
      } else {
        setSuccess(`Action "${action.replace(/_/g, " ")}" completed successfully`)
        setTimeout(() => router.push("/admin/review"), 1500)
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
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
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={fields.company}
            onChange={(e) => handleChange("company", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="round_type">Round / Stage</Label>
          <Input
            id="round_type"
            value={fields.round_type}
            onChange={(e) => handleChange("round_type", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            value={fields.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            placeholder="e.g. 500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={fields.currency}
            onChange={(e) => handleChange("currency", e.target.value)}
            placeholder="INR or USD"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deal_date">Deal Date</Label>
          <Input
            id="deal_date"
            type="date"
            value={fields.deal_date}
            onChange={(e) => handleChange("deal_date", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={fields.location}
            onChange={(e) => handleChange("location", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="investors">Investors (comma-separated)</Label>
          <Input
            id="investors"
            value={fields.investors}
            onChange={(e) => handleChange("investors", e.target.value)}
            placeholder="Sequoia, Accel, ..."
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="sectors">Sectors (comma-separated)</Label>
          <Input
            id="sectors"
            value={fields.sectors}
            onChange={(e) => handleChange("sectors", e.target.value)}
            placeholder="Fintech, SaaS, ..."
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="source_url">Source URL</Label>
          <Input
            id="source_url"
            value={fields.source_url}
            onChange={(e) => handleChange("source_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add reviewer notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={() => handleAction("approve")}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? "Processing..." : "Approve"}
        </Button>
        <Button
          onClick={() => handleAction("needs_more_info")}
          disabled={loading}
          variant="secondary"
        >
          Needs Info
        </Button>
        <Button
          onClick={() => handleAction("reject")}
          disabled={loading}
          variant="destructive"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}
