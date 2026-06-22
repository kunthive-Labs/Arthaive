"use client"

import { GripVertical, Settings2, X } from "lucide-react"
import type { FundingDeal } from "@/data/funding-data"
import type { DashboardWidget, WidgetConfig } from "@/lib/dashboard/types"
import { getWidgetDef } from "@/lib/dashboard/widget-registry"
import { WidgetRenderer } from "./widget-renderer"
import { WidgetSettings } from "./widget-settings"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function WidgetFrame({
  widget,
  deals,
  editing,
  onConfigChange,
  onRemove,
}: {
  widget: DashboardWidget
  deals: FundingDeal[]
  editing: boolean
  onConfigChange: (config: WidgetConfig) => void
  onRemove: () => void
}) {
  const def = getWidgetDef(widget.type)
  const title = widget.config.title || def?.label || "Widget"

  return (
    <div className="flex h-full flex-col border-[3px] border-black bg-white shadow-[3px_3px_0_#000]">
      <div className="flex items-center justify-between gap-1 border-b-2 border-black bg-[#F6F5F1] px-2 py-1">
        <div className="flex min-w-0 items-center gap-1">
          {editing && (
            <span className="widget-drag-handle cursor-grab text-gray-400 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <span className="truncate text-[11px] font-bold uppercase tracking-wide">{title}</span>
        </div>
        {editing && (
          <div className="flex items-center gap-0.5">
            {def && def.filters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="rounded p-1 text-gray-500 hover:bg-black/5 hover:text-black"
                    aria-label="Widget settings"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 border-[3px] border-black p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide">{def.label}</div>
                  <WidgetSettings def={def} config={widget.config} deals={deals} onChange={onConfigChange} />
                </PopoverContent>
              </Popover>
            )}
            <button
              onClick={onRemove}
              className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove widget"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <WidgetRenderer widget={widget} deals={deals} />
      </div>
    </div>
  )
}
