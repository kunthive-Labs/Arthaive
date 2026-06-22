"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import RGL from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Plus, Pencil, Check, Trash2, Save, LayoutGrid, AlertTriangle, X } from "lucide-react"
import type { FundingDeal } from "@/data/funding-data"
import type { Dashboard, DashboardWidget, GridLayoutItem, WidgetConfig } from "@/lib/dashboard/types"
import { getWidgetDef } from "@/lib/dashboard/widget-registry"
import { useDashboards } from "@/hooks/use-dashboards"
import { WidgetFrame } from "./widget-frame"
import { AddWidgetGallery } from "./add-widget-gallery"

const ResponsiveGridLayout = RGL.WidthProvider(RGL.Responsive)
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }
const ROW_HEIGHT = 40

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `w-${Math.random().toString(36).slice(2)}`
}

// Lowest free y for a new item placed at x=0.
function nextY(layout: GridLayoutItem[]): number {
  return layout.reduce((max, l) => Math.max(max, l.y + l.h), 0)
}

export function DashboardBuilder({
  initialDeals,
  initialDashboards,
}: {
  initialDeals: FundingDeal[]
  initialDashboards: Dashboard[]
}) {
  const { dashboards, create, save, remove } = useDashboards(initialDashboards)
  const [activeId, setActiveId] = useState<string | null>(initialDashboards[0]?.id ?? null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // staged working copy of the active dashboard
  const [workLayout, setWorkLayout] = useState<GridLayoutItem[]>([])
  const [workWidgets, setWorkWidgets] = useState<DashboardWidget[]>([])
  const [nameDraft, setNameDraft] = useState("")

  const active = useMemo(
    () => dashboards.find((d) => d.id === activeId) ?? null,
    [dashboards, activeId]
  )

  // Re-seed the working copy whenever the active dashboard changes.
  useEffect(() => {
    if (!active) return
    setWorkLayout(active.layout ?? [])
    setWorkWidgets(active.widgets ?? [])
    setNameDraft(active.name)
    setDirty(false)
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(async () => {
    setError(null)
    try {
      const d = await create(`Dashboard ${dashboards.length + 1}`)
      setActiveId(d.id)
      setEditing(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create dashboard")
    }
  }, [create, dashboards.length])

  const handleLayoutChange = useCallback(
    (_current: GridLayoutItem[], all: Record<string, GridLayoutItem[]>) => {
      if (!editing) return
      const lg = (all.lg ?? []).map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
      setWorkLayout(lg)
      setDirty(true)
    },
    [editing]
  )

  const addWidget = useCallback(
    (type: string) => {
      const def = getWidgetDef(type)
      if (!def) return
      const i = newId()
      setWorkWidgets((prev) => [...prev, { i, type, config: {} }])
      setWorkLayout((prev) => [
        ...prev,
        {
          i,
          x: 0,
          y: nextY(prev),
          w: def.defaultSize.w,
          h: def.defaultSize.h,
          minW: def.minSize?.w ?? 2,
          minH: def.minSize?.h ?? 3,
        },
      ])
      setDirty(true)
    },
    []
  )

  const removeWidget = useCallback((i: string) => {
    setWorkWidgets((prev) => prev.filter((w) => w.i !== i))
    setWorkLayout((prev) => prev.filter((l) => l.i !== i))
    setDirty(true)
  }, [])

  const changeConfig = useCallback((i: string, config: WidgetConfig) => {
    setWorkWidgets((prev) => prev.map((w) => (w.i === i ? { ...w, config } : w)))
    setDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!activeId) return
    setError(null)
    setSaving(true)
    try {
      await save(activeId, { name: nameDraft, layout: workLayout, widgets: workWidgets })
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save dashboard")
    } finally {
      setSaving(false)
    }
  }, [activeId, nameDraft, workLayout, workWidgets, save])

  const handleDelete = useCallback(async () => {
    if (!activeId) return
    if (!window.confirm("Delete this dashboard? This cannot be undone.")) return
    setError(null)
    const remaining = dashboards.filter((d) => d.id !== activeId)
    try {
      await remove(activeId)
      setActiveId(remaining[0]?.id ?? null)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete dashboard")
    }
  }, [activeId, dashboards, remove])

  // ---- No dashboards yet ----
  if (!dashboards.length) {
    return (
      <div className="mx-auto mt-16 max-w-md border-[3px] border-black bg-white p-8 text-center shadow-[6px_6px_0_#000]">
        <LayoutGrid className="mx-auto h-10 w-10 text-[#1A5D1A]" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Build your first dashboard</h2>
        <p className="mt-2 text-sm text-gray-500">
          Compose a personal view of India&apos;s funding data — KPI tiles, trends, leaderboards and more.
        </p>
        <button
          onClick={handleCreate}
          className="mt-6 inline-flex items-center gap-2 border-[3px] border-black bg-[#1A5D1A] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> New dashboard
        </button>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mt-5 text-left" />}
      </div>
    )
  }

  const layouts = { lg: workLayout }

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}

      {/* Dashboard switcher + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_#000]">
        <div className="flex flex-wrap items-center gap-2">
          {dashboards.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveId(d.id)}
              className={`border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                d.id === activeId
                  ? "bg-[#1A5D1A] text-white shadow-[2px_2px_0_#000]"
                  : "bg-white hover:bg-[#1A5D1A]/10"
              }`}
            >
              {d.name}
            </button>
          ))}
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1 border-2 border-dashed border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-[#1A5D1A]/10"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        <div className="flex items-center gap-2">
          {editing && (
            <>
              <AddWidgetGallery
                onAdd={addWidget}
                trigger={
                  <button className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-[#1A5D1A]/10">
                    <Plus className="h-3.5 w-3.5" /> Add widget
                  </button>
                }
              />
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1 border-2 border-black bg-[#1A5D1A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-[2px_2px_0_#000] disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-50"
                aria-label="Delete dashboard"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (editing && dirty) handleSave()
              setEditing((e) => !e)
            }}
            className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-[#1A5D1A]/10"
          >
            {editing ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
          </button>
        </div>
      </div>

      {/* Editable name */}
      {editing && active && (
        <input
          value={nameDraft}
          onChange={(e) => {
            setNameDraft(e.target.value)
            setDirty(true)
          }}
          className="mt-4 w-full max-w-md border-b-[3px] border-black bg-transparent text-3xl font-bold tracking-tight focus:outline-none"
        />
      )}

      {/* Canvas */}
      {active && workWidgets.length === 0 ? (
        <div className="mt-6 border-[3px] border-dashed border-black bg-white p-12 text-center">
          <p className="text-sm font-semibold text-gray-500">
            This dashboard is empty.{" "}
            {editing ? "Use “Add widget” to place your first chart." : "Switch to Edit to add widgets."}
          </p>
          {editing && (
            <AddWidgetGallery
              onAdd={addWidget}
              trigger={
                <button className="mt-4 inline-flex items-center gap-1 border-[3px] border-black bg-[#1A5D1A] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_#000]">
                  <Plus className="h-4 w-4" /> Add widget
                </button>
              }
            />
          )}
        </div>
      ) : (
        <ResponsiveGridLayout
          className="mt-4"
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[16, 16]}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={handleLayoutChange}
          compactType="vertical"
        >
          {workWidgets.map((w) => (
            <div key={w.i}>
              <WidgetFrame
                widget={w}
                deals={initialDeals}
                editing={editing}
                onConfigChange={(config) => changeConfig(w.i, config)}
                onRemove={() => removeWidget(w.i)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}

function ErrorBanner({
  message,
  onDismiss,
  className = "",
}: {
  message: string
  onDismiss: () => void
  className?: string
}) {
  // The "table not found" error from Supabase is the common first-run case —
  // make it actionable rather than cryptic.
  const isMissingTable = /dashboards/i.test(message) && /(could not find|does not exist|schema cache|relation)/i.test(message)
  return (
    <div className={`flex items-start gap-3 border-[3px] border-red-600 bg-red-50 p-4 ${className}`}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-red-700">Couldn&apos;t save to the database</p>
        {isMissingTable ? (
          <p className="mt-1 text-red-700/90">
            The <code className="font-mono">dashboards</code> table doesn&apos;t exist yet. Apply
            migration <code className="font-mono">018_dashboards.sql</code> to your Supabase project
            (SQL editor or <code className="font-mono">supabase db push</code>), then reload.
          </p>
        ) : (
          <p className="mt-1 break-words text-red-700/90">{message}</p>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-red-600 hover:text-red-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
