import { createClient } from "./server"
import type { Database } from "@/types/database.types"

type Watchlist = Database["public"]["Tables"]["watchlist"]["Row"]
type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"]
type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"]
type Alert = Database["public"]["Tables"]["alerts"]["Row"]

export async function getWatchlist(userId: string): Promise<Watchlist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function addToWatchlist(userId: string, company: string) {
  const supabase = await createClient()
  return supabase.from("watchlist").insert({ user_id: userId, company })
}

export async function removeFromWatchlist(userId: string, company: string) {
  const supabase = await createClient()
  return supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("company", company)
}

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function toggleBookmark(userId: string, dealId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("deal_id", dealId)
    .single()

  if (existing) {
    return supabase.from("bookmarks").delete().eq("id", existing.id)
  }
  return supabase.from("bookmarks").insert({ user_id: userId, deal_id: dealId })
}

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function saveSearch(userId: string, name: string, filters: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from("saved_searches").insert({ user_id: userId, name, filters: filters as import("@/types/database.types").Json })
}

export async function getAlerts(userId: string): Promise<Alert[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function createAlert(
  userId: string,
  opts: { sector?: string; stage?: string; minAmount?: number }
) {
  const supabase = await createClient()
  return supabase.from("alerts").insert({
    user_id: userId,
    sector: opts.sector ?? null,
    stage: opts.stage ?? null,
    min_amount: opts.minAmount ?? null,
  })
}

export async function toggleAlert(alertId: string, active: boolean) {
  const supabase = await createClient()
  return supabase.from("alerts").update({ active }).eq("id", alertId)
}

export async function deleteAlert(alertId: string) {
  const supabase = await createClient()
  return supabase.from("alerts").delete().eq("id", alertId)
}


export async function getBookmarkCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("bookmarks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}


export async function getWatchlistCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}


export async function deactivateAllAlerts(userId: string) {
  const supabase = await createClient()
  return supabase.from("alerts").update({ active: false }).eq("user_id", userId)
}


export async function countAlertMatches(
  sector: string | null,
  stage: string | null,
  minAmount: number | null,
  deals: import("@/data/funding-data").FundingDeal[]
): Promise<number> {
  return deals.filter((d) => {
    if (sector && !d.sectors?.includes(sector)) return false
    if (stage && d.stage !== stage) return false
    if (minAmount && d.amount < minAmount) return false
    return true
  }).length
}


export async function getActiveAlerts(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
  return data ?? []
}
