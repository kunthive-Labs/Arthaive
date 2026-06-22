"use client"

import { useMemo } from "react"
import type { FundingDeal } from "@/data/funding-data"
import type { DashboardWidget } from "@/lib/dashboard/types"
import { getWidgetDef } from "@/lib/dashboard/widget-registry"
import { filterDeals } from "@/lib/dashboard/filter-deals"

export function WidgetRenderer({
  widget,
  deals,
}: {
  widget: DashboardWidget
  deals: FundingDeal[]
}) {
  const def = getWidgetDef(widget.type)
  const filtered = useMemo(() => filterDeals(deals, widget.config), [deals, widget.config])

  if (!def) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        Unknown widget: {widget.type}
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        No deals match this widget&apos;s filters.
      </div>
    )
  }

  return <div className="h-full w-full">{def.render(filtered, widget.config)}</div>
}
