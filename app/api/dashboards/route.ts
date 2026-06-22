import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { listDashboards, createDashboard } from "@/lib/supabase/dashboards"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const dashboards = await listDashboards(user.id)
  return NextResponse.json(dashboards)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, layout, widgets, isDefault } = await req.json()
  const { data, error } = await createDashboard(user.id, name ?? "Untitled dashboard", {
    layout,
    widgets,
    isDefault,
  })
  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Could not create dashboard" },
      { status: 500 }
    )
  }
  return NextResponse.json(data)
}
