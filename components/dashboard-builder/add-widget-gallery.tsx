"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  WIDGET_LIST, CATEGORY_ORDER, CATEGORY_LABEL,
} from "@/lib/dashboard/widget-registry"

export function AddWidgetGallery({
  onAdd,
  trigger,
}: {
  onAdd: (type: string) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-[3px] border-black">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Add a widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = WIDGET_LIST.filter((w) => w.category === cat)
            if (!items.length) return null
            return (
              <div key={cat}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
                  {CATEGORY_LABEL[cat]}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((w) => {
                    const Icon = w.icon
                    return (
                      <button
                        key={w.type}
                        onClick={() => {
                          onAdd(w.type)
                          setOpen(false)
                        }}
                        className="flex items-start gap-3 border-2 border-black bg-white p-3 text-left transition-all hover:bg-[#1A5D1A]/5 hover:shadow-[3px_3px_0_#000]"
                      >
                        <span className="mt-0.5 shrink-0 border-2 border-black bg-[#F6F5F1] p-1.5">
                          <Icon className="h-4 w-4 text-[#1A5D1A]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{w.label}</span>
                          <span className="block text-xs text-gray-500">{w.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
