import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getDashboard, updateDashboard, deleteDashboard } from "@/lib/supabase/dashboards"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const dashboard = await getDashboard(user.id, id)
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dashboard)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { name, layout, widgets } = await req.json()
  const dashboard = await updateDashboard(user.id, id, { name, layout, widgets })
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(dashboard)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await deleteDashboard(user.id, id)
  return NextResponse.json({ ok: true })
}
