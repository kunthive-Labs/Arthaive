"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSavedSearches } from "@/hooks/use-saved-searches"
import { useAuth } from "@/hooks/use-auth"

export function SaveSearchButton({ filters }: { filters: Record<string, unknown> }) {
  const { user } = useAuth()
  const { save } = useSavedSearches()
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)

  if (!user) return null

  async function handleSave() {
    if (!name.trim()) return
    await save(name.trim(), filters)
    setName("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Search name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
