"use client"

import { useCallback, useState } from "react"
import type { Dashboard, DashboardWidget, GridLayoutItem } from "@/lib/dashboard/types"

interface SavePatch {
  name?: string
  layout?: GridLayoutItem[]
  widgets?: DashboardWidget[]
}

// Client-side store over the /api/dashboards REST routes, seeded with the
// server-fetched list so there is no initial loading flash.
export function useDashboards(initial: Dashboard[]) {
  const [dashboards, setDashboards] = useState<Dashboard[]>(initial)

  const create = useCallback(async (name: string): Promise<Dashboard | null> => {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const d = (await res.json()) as Dashboard | null
    if (d?.id) setDashboards((prev) => [...prev, d])
    return d
  }, [])

  const save = useCallback(async (id: string, patch: SavePatch) => {
    // optimistic local update
    setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
    await fetch(`/api/dashboards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }, [])

  const remove = useCallback(async (id: string) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/dashboards/${id}`, { method: "DELETE" })
  }, [])

  return { dashboards, create, save, remove }
}
