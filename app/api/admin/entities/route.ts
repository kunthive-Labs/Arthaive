import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    type: "startup" | "investor"
    canonical: string
    alias: string
    alias_type?: string
  }

  const { type, canonical, alias, alias_type } = body

  if (!canonical || !alias) {
    return NextResponse.json({ error: "canonical and alias are required" }, { status: 400 })
  }

  const supabase = await createClient()

  if (type === "startup") {
    const { data, error } = await supabase
      .from("startup_aliases")
      .insert({
        company: canonical,
        alias_name: alias,
        alias_type: alias_type ?? "alternate_spelling",
      })
      .select("id")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data.id })
  } else {
    const { data, error } = await supabase
      .from("investor_aliases")
      .insert({
        investor_name: canonical,
        alias_name: alias,
      })
      .select("id")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data.id })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    type: "startup" | "investor"
    alias_id: string
  }

  const { type, alias_id } = body

  if (!alias_id) {
    return NextResponse.json({ error: "alias_id is required" }, { status: 400 })
  }

  const supabase = await createClient()

  if (type === "startup") {
    const { error } = await supabase
      .from("startup_aliases")
      .delete()
      .eq("id", alias_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from("investor_aliases")
      .delete()
      .eq("id", alias_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
