"use client"

import { useEffect, useState } from "react"
import { X, Check } from "lucide-react"
import { useDealNote } from "@/hooks/use-notes"
import { useAuth } from "@/hooks/use-auth"

// Private research notes + tags on a single deal. Rendered inside DealDetail.
// Only visible to a signed-in user (the whole app is gated, so that is always
// true in practice, but we guard anyway).
export function DealNotes({ dealId }: { dealId: string }) {
  const { user } = useAuth()
  const { note, loading, saving, save } = useDealNote(dealId)

  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState("")
  const [justSaved, setJustSaved] = useState(false)

  // Hydrate the editor once the stored note loads.
  useEffect(() => {
    setContent(note.content)
    setTags(note.tags)
  }, [note.content, note.tags])

  if (!user) return null

  const dirty = content !== note.content || !sameTags(tags, note.tags)

  function addTag() {
    const t = tagDraft.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagDraft("")
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t))
  }

  async function handleSave() {
    await save(content, tags)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  return (
    <div className="neo-border p-6 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-green-700">
          My Notes
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Private
        </span>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse bg-gray-100" />
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Why does this round matter? What to watch next?"
            rows={4}
            className="w-full resize-y border-2 border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus:border-black focus:outline-none"
          />

          {/* Tags */}
          <div className="mt-4">
            <div className="text-xs font-bold uppercase text-gray-400 mb-2">Tags</div>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 neo-border-accent bg-green-50 px-2 py-1 text-xs font-bold uppercase"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                    className="text-green-700 hover:text-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addTag()
                  }
                }}
                onBlur={addTag}
                placeholder="add tag…"
                className="w-24 border-2 border-gray-200 bg-white px-2 py-1 text-xs font-semibold focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!dirty && !justSaved)}
              className="bg-green-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-green-700">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {note.updatedAt && !justSaved && (
              <span className="text-xs text-gray-400">
                Last saved {formatWhen(note.updatedAt)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function sameTags(a: string[], b: string[]) {
  return a.length === b.length && a.every((t, i) => t === b[i])
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
