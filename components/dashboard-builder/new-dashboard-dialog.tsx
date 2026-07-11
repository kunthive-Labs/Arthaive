"use client"

import { useState } from "react"
import { LayoutGrid, SquareDashed } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from "@/lib/dashboard/templates"

// Create-dashboard picker: start blank or from a starter template.
export function NewDashboardDialog({
  onCreate,
  trigger,
}: {
  onCreate: (template: DashboardTemplate | null) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const pick = (template: DashboardTemplate | null) => {
    onCreate(template)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-[3px] border-black">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">New dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <button
            onClick={() => pick(null)}
            className="flex w-full items-start gap-3 border-2 border-dashed border-black bg-white p-3 text-left transition-all hover:bg-[#1A5D1A]/5 hover:shadow-[3px_3px_0_#000]"
          >
            <span className="mt-0.5 shrink-0 border-2 border-black bg-[#F6F5F1] p-1.5">
              <SquareDashed className="h-4 w-4 text-[#1A5D1A]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Blank</span>
              <span className="block text-xs text-gray-500">Start from an empty canvas and add widgets yourself.</span>
            </span>
          </button>
          <div className="pt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
            Start from a template
          </div>
          {DASHBOARD_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t)}
              className="flex w-full items-start gap-3 border-2 border-black bg-white p-3 text-left transition-all hover:bg-[#1A5D1A]/5 hover:shadow-[3px_3px_0_#000]"
            >
              <span className="mt-0.5 shrink-0 border-2 border-black bg-[#F6F5F1] p-1.5">
                <LayoutGrid className="h-4 w-4 text-[#1A5D1A]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t.name}</span>
                <span className="block text-xs text-gray-500">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
