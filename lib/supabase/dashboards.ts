import { createClient } from "./server"
import type { Database, Json } from "@/types/database.types"
import type { Dashboard, DashboardLayouts, DashboardWidget, GridLayoutItem } from "@/lib/dashboard/types"

// Normalize the layout jsonb into the per-breakpoint shape. Legacy rows stored
// a bare react-grid-layout array (the lg breakpoint only) — wrap those as
// `{ lg: array }` so callers always see a DashboardLayouts object.
function normalizeLayout(layout: Json): DashboardLayouts {
  if (Array.isArray(layout)) return { lg: layout as unknown as GridLayoutItem[] }
  if (layout && typeof layout === "object") return layout as unknown as DashboardLayouts
  return {}
}

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
    layout: normalizeLayout(row.layout),
    widgets: (row.widgets as unknown as DashboardWidget[]) ?? [],
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// A user has at most one default dashboard: clear the flag on every other row
// before setting it. Two queries, but this is a low-frequency operation.
async function clearOtherDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exceptId?: string
) {
  let query = supabase.from("dashboards").update({ is_default: false }).eq("user_id", userId)
  if (exceptId) query = query.neq("id", exceptId)
  await query
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
  opts: { layout?: DashboardLayouts; widgets?: DashboardWidget[]; isDefault?: boolean } = {}
): Promise<{ data: Dashboard | null; error: string | null }> {
  const supabase = await createClient()
  if (opts.isDefault) await clearOtherDefaults(supabase, userId)
  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: userId,
      name,
      layout: (opts.layout ?? {}) as unknown as Json,
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
  patch: { name?: string; layout?: DashboardLayouts; widgets?: DashboardWidget[]; isDefault?: boolean }
): Promise<{ data: Dashboard | null; error: string | null }> {
  const supabase = await createClient()
  if (patch.isDefault) await clearOtherDefaults(supabase, userId, id)
  const update: Database["public"]["Tables"]["dashboards"]["Update"] = {
    updated_at: new Date().toISOString(),
  }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.layout !== undefined) update.layout = patch.layout as unknown as Json
  if (patch.widgets !== undefined) update.widgets = patch.widgets as unknown as Json
  if (patch.isDefault !== undefined) update.is_default = patch.isDefault

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
