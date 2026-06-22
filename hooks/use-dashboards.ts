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

  async function readError(res: Response, fallback: string): Promise<string> {
    try {
      const body = await res.json()
      return body?.error || fallback
    } catch {
      return fallback
    }
  }

  const create = useCallback(async (name: string): Promise<Dashboard> => {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(await readError(res, "Failed to create dashboard"))
    const d = (await res.json()) as Dashboard
    setDashboards((prev) => [...prev, d])
    return d
  }, [])

  const save = useCallback(async (id: string, patch: SavePatch) => {
    // optimistic local update
    setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
    const res = await fetch(`/api/dashboards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(await readError(res, "Failed to save dashboard"))
  }, [])

  const remove = useCallback(async (id: string) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id))
    const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error(await readError(res, "Failed to delete dashboard"))
  }, [])

  return { dashboards, create, save, remove }
}
