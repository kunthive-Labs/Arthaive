"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./use-auth"

export interface DealNote {
  content: string
  tags: string[]
  updatedAt: string | null
}

const EMPTY: DealNote = { content: "", tags: [], updatedAt: null }

// Private note + tags for a single deal, accessed through an authenticated API.
export function useDealNote(dealId: string) {
  const { user } = useAuth()
  const [note, setNote] = useState<DealNote>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    if (!user) {
      setNote(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    const response = await fetch(`/api/notes?dealId=${encodeURIComponent(dealId)}`)
    const data = response.ok
      ? ((await response.json()) as {
          content: string
          tags: string[] | null
          updated_at: string
        } | null)
      : null
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

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, content: trimmed, tags: cleanTags }),
      })
      if (!response.ok) {
        setSaving(false)
        return
      }

      if (!trimmed && cleanTags.length === 0) {
        setNote(EMPTY)
      } else {
        const updatedAt = new Date().toISOString()
        setNote({ content: trimmed, tags: cleanTags, updatedAt })
      }
      setSaving(false)
    },
    [user, dealId]
  )

  return { note, loading, saving, save, reload: load }
}
