"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./use-auth"

interface Alert {
  id: string
  sector: string | null
  stage: string | null
  min_amount: number | null
  active: boolean
  created_at: string
}

export function useAlerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const res = await fetch("/api/alerts")
    if (res.ok) setAlerts(await res.json())
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (opts: { sector?: string; stage?: string; minAmount?: number }) => {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    })
    if (res.ok) await load()
    return res.ok
  }, [load])

  const toggle = useCallback(async (id: string, active: boolean) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    })
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active } : a))
  }, [])

  const remove = useCallback(async (id: string) => {
    await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { alerts, loading, create, toggle, remove }
}
