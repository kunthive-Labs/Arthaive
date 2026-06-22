"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./use-auth"

export interface DealNote {
  content: string
  tags: string[]
  updatedAt: string | null
}

const EMPTY: DealNote = { content: "", tags: [], updatedAt: null }

// Private note + tags for a single deal, backed directly by Supabase (RLS
// scopes every row to the signed-in user). Mirrors use-bookmarks.
export function useDealNote(dealId: string) {
  const { user } = useAuth()
  const [note, setNote] = useState<DealNote>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!user) {
      setNote(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("deal_notes")
      .select("content, tags, updated_at")
      .eq("user_id", user.id)
      .eq("deal_id", dealId)
      .maybeSingle()
    setNote(
      data
        ? { content: data.content, tags: data.tags ?? [], updatedAt: data.updated_at }
        : EMPTY
    )
    setLoading(false)
  }, [user, dealId])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (content: string, tags: string[]) => {
      if (!user) return
      setSaving(true)
      const trimmed = content.trim()
      const cleanTags = Array.from(
        new Set(tags.map((t) => t.trim()).filter(Boolean))
      )

      if (!trimmed && cleanTags.length === 0) {
        await supabase
          .from("deal_notes")
          .delete()
          .eq("user_id", user.id)
          .eq("deal_id", dealId)
        setNote(EMPTY)
      } else {
        const updatedAt = new Date().toISOString()
        await supabase.from("deal_notes").upsert(
          {
            user_id: user.id,
            deal_id: dealId,
            content: trimmed,
            tags: cleanTags,
            updated_at: updatedAt,
          },
          { onConflict: "user_id,deal_id" }
        )
        setNote({ content: trimmed, tags: cleanTags, updatedAt })
      }
      setSaving(false)
    },
    [user, dealId]
  )

  return { note, loading, saving, save, reload: load }
}
