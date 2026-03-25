"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export function AlertBuilder() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [sector, setSector] = useState("")
  const [stage, setStage] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function handleCreate() {
    setSaving(true)
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: sector || undefined,
        stage: stage || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Alert created")
      setOpen(false)
      setSector(""); setStage(""); setMinAmount("")
    } else {
      toast.error("Failed to create alert")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" /> Create alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create deal alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="sector">Sector (optional)</Label>
            <Input id="sector" placeholder="e.g. Fintech" value={sector} onChange={(e) => setSector(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="stage">Stage (optional)</Label>
            <Input id="stage" placeholder="e.g. Series A" value={stage} onChange={(e) => setStage(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="amount">Min amount ₹ Cr (optional)</Label>
            <Input id="amount" type="number" placeholder="e.g. 50" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
