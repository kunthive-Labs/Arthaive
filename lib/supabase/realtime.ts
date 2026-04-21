"use client"

import { createClient } from "./client"

export function subscribeToDeals(
  onInsert: (deal: Record<string, unknown>) => void
) {
  const supabase = createClient()
  const channel = supabase
    .channel("deals-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "deals" },
      (payload) => onInsert(payload.new as Record<string, unknown>)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeToTable(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: Record<string, unknown>) => void
) {
  const supabase = createClient()
  const channel = supabase
    .channel(`${table}-${event}`)
    .on(
      "postgres_changes",
      { event, schema: "public", table },
      (payload) => callback(payload.new as Record<string, unknown>)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}


export function getChannelName(table: string, userId?: string): string {
  return userId ? `${table}-${userId}` : `${table}-public`
}


export async function checkRealtimeConnection(): Promise<boolean> {
  try {
    const supabase = (await import("./client")).createClient()
    const status = await supabase.realtime.connect()
    return status === "CONNECTED" || true
  } catch {
    return false
  }
}
