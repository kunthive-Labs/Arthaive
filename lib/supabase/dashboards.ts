import { createClient } from "./server"
import type { Database, Json } from "@/types/database.types"
import type { Dashboard, DashboardWidget, GridLayoutItem } from "@/lib/dashboard/types"

// Coerce the raw DB row (jsonb columns typed as Json) into our richer shape.
function hydrate(row: {
  id: string
  user_id: string
  name: string
  layout: Json
  widgets: Json
  is_default: boolean
  created_at: string
  updated_at: string
}): Dashboard {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    layout: (row.layout as unknown as GridLayoutItem[]) ?? [],
    widgets: (row.widgets as unknown as DashboardWidget[]) ?? [],
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listDashboards(userId: string): Promise<Dashboard[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("dashboards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  return (data ?? []).map(hydrate)
}

export async function getDashboard(userId: string, id: string): Promise<Dashboard | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("dashboards")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle()
  return data ? hydrate(data) : null
}

export async function createDashboard(
  userId: string,
  name: string,
  opts: { layout?: GridLayoutItem[]; widgets?: DashboardWidget[]; isDefault?: boolean } = {}
): Promise<{ data: Dashboard | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: userId,
      name,
      layout: (opts.layout ?? []) as unknown as Json,
      widgets: (opts.widgets ?? []) as unknown as Json,
      is_default: opts.isDefault ?? false,
    })
    .select()
    .single()
  return { data: data ? hydrate(data) : null, error: error?.message ?? null }
}

export async function updateDashboard(
  userId: string,
  id: string,
  patch: { name?: string; layout?: GridLayoutItem[]; widgets?: DashboardWidget[] }
): Promise<{ data: Dashboard | null; error: string | null }> {
  const supabase = await createClient()
  const update: Database["public"]["Tables"]["dashboards"]["Update"] = {
    updated_at: new Date().toISOString(),
  }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.layout !== undefined) update.layout = patch.layout as unknown as Json
  if (patch.widgets !== undefined) update.widgets = patch.widgets as unknown as Json

  const { data, error } = await supabase
    .from("dashboards")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single()
  return { data: data ? hydrate(data) : null, error: error?.message ?? null }
}

export async function deleteDashboard(userId: string, id: string) {
  const supabase = await createClient()
  return supabase.from("dashboards").delete().eq("user_id", userId).eq("id", id)
}
