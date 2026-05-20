"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Alias {
  id: string
  alias_name: string
}

interface AliasManagerProps {
  type: "startup" | "investor"
  canonical: string
  aliases: Alias[]
}

export function AliasManager({ type, canonical, aliases: initialAliases }: AliasManagerProps) {
  const router = useRouter()
  const [aliases, setAliases] = useState(initialAliases)
  const [newAlias, setNewAlias] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newAlias.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, canonical, alias: newAlias.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to add alias")
      } else {
        setAliases((prev) => [...prev, { id: json.id, alias_name: newAlias.trim() }])
        setNewAlias("")
        router.refresh()
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(aliasId: string) {
    setDeletingId(aliasId)
    setError(null)

    try {
      const res = await fetch("/api/admin/entities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, alias_id: aliasId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to delete alias")
      } else {
        setAliases((prev) => prev.filter((a) => a.id !== aliasId))
        router.refresh()
      }
    } catch {
      setError("Network error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Existing aliases */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Aliases</h3>
        {aliases.length > 0 ? (
          <ul className="space-y-2">
            {aliases.map((alias) => (
              <li
                key={alias.id}
                className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
              >
                <span className="text-sm">{alias.alias_name}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(alias.id)}
                  disabled={deletingId === alias.id}
                  className="h-7 text-xs"
                >
                  {deletingId === alias.id ? "Deleting..." : "Delete"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 py-2">No aliases yet</p>
        )}
      </div>

      {/* Add alias form */}
      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="new-alias">Add New Alias</Label>
        <div className="flex gap-2">
          <Input
            id="new-alias"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder={`Alternate name for ${canonical}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
            }}
          />
          <Button onClick={handleAdd} disabled={loading || !newAlias.trim()}>
            {loading ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </div>
  )
}
