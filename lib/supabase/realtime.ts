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
    await supabase.realtime.connect()
    return true
  } catch {
    return false
  }
}


export function formatDealEvent(payload: Record<string, unknown>): string {
  const company = payload.company as string ?? "Unknown"
  const amount = payload.amount as number ?? 0
  const stage = payload.stage as string ?? ""
  return `${company} raised ₹${amount.toLocaleString("en-IN")} Cr (${stage})`
}


export function exponentialBackoff(attempt: number, baseMs = 500): number {
  return Math.min(baseMs * Math.pow(2, attempt), 30000)
}
