import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getAlerts, createAlert, toggleAlert, deleteAlert } from "@/lib/supabase/profile"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const alerts = await getAlerts(user.id)
  return NextResponse.json(alerts)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { error } = await createAlert(user.id, {
    sector: body.sector,
    stage: body.stage,
    minAmount: body.minAmount,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, active } = await req.json()
  await toggleAlert(user.id, id, active)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await deleteAlert(user.id, id)
  return NextResponse.json({ ok: true })
}
