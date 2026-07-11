"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import RGL from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import {
  Plus, Pencil, Check, Trash2, Save, Star, LayoutGrid, AlertTriangle, X, Sparkles,
} from "lucide-react"
import type { FundingDeal } from "@/data/funding-data"
import type {
  Dashboard, DashboardBreakpoint, DashboardLayouts, DashboardWidget, GridLayoutItem, WidgetConfig,
} from "@/lib/dashboard/types"
import { getWidgetDef } from "@/lib/dashboard/widget-registry"
import { instantiateTemplate, type DashboardTemplate } from "@/lib/dashboard/templates"
import { buildDashboardContext, suggestionToWidgetConfig } from "@/lib/dashboard/chat-context"
import { useDashboards } from "@/hooks/use-dashboards"
import type { ChatWidgetSuggestion } from "@/hooks/use-groq-chat"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { WidgetFrame } from "./widget-frame"
import { AddWidgetGallery } from "./add-widget-gallery"
import { NewDashboardDialog } from "./new-dashboard-dialog"
import { ChatPanel } from "./chat-panel"

const ResponsiveGridLayout = RGL.WidthProvider(RGL.Responsive)
const COLS: Record<DashboardBreakpoint, number> = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }
const BREAKPOINTS: DashboardBreakpoint[] = ["lg", "md", "sm", "xs", "xxs"]
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
  initialActiveId,
}: {
  initialDeals: FundingDeal[]
  initialDashboards: Dashboard[]
  initialActiveId?: string | null
}) {
  const { dashboards, create, save, remove } = useDashboards(initialDashboards)
  const [activeId, setActiveId] = useState<string | null>(
    initialActiveId ?? initialDashboards[0]?.id ?? null
  )
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const isMobile = useIsMobile()

  // staged working copy of the active dashboard
  const [workLayouts, setWorkLayouts] = useState<DashboardLayouts>({})
  const [workWidgets, setWorkWidgets] = useState<DashboardWidget[]>([])
  const [nameDraft, setNameDraft] = useState("")

  const active = useMemo(
    () => dashboards.find((d) => d.id === activeId) ?? null,
    [dashboards, activeId]
  )

  // Re-seed the working copy whenever the active dashboard changes.
  useEffect(() => {
    if (!active) return
    setWorkLayouts(active.layout ?? {})
    setWorkWidgets(active.widgets ?? [])
    setNameDraft(active.name)
    setDirty(false)
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(
    async (template: DashboardTemplate | null) => {
      setError(null)
      try {
        const d = template
          ? await create(template.name, instantiateTemplate(template))
          : await create(`Dashboard ${dashboards.length + 1}`)
        setActiveId(d.id)
        setEditing(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create dashboard")
      }
    },
    [create, dashboards.length]
  )

  const handleLayoutChange = useCallback(
    (_current: GridLayoutItem[], all: Record<string, GridLayoutItem[]>) => {
      if (!editing) return
      // Persist every breakpoint RGL reports (breakpoints the user never
      // visited stay absent; RGL derives them from the closest defined one).
      const next: DashboardLayouts = {}
      for (const bp of BREAKPOINTS) {
        const items = all[bp]
        if (!items) continue
        next[bp] = items.map((l) => ({
          i: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
          ...(l.minW !== undefined ? { minW: l.minW } : {}),
          ...(l.minH !== undefined ? { minH: l.minH } : {}),
        }))
      }
      setWorkLayouts(next)
      setDirty(true)
    },
    [editing]
  )

  const addWidget = useCallback(
    (type: string, config: WidgetConfig = {}) => {
      const def = getWidgetDef(type)
      if (!def) return
      const i = newId()
      setWorkWidgets((prev) => [...prev, { i, type, config }])
      // Append at the bottom of every breakpoint we track (always lg, plus any
      // the user already rearranged), clamping width to the breakpoint's cols.
      setWorkLayouts((prev) => {
        const next: DashboardLayouts = {}
        for (const bp of BREAKPOINTS) {
          if (bp !== "lg" && !prev[bp]) continue
          const items = prev[bp] ?? []
          next[bp] = [
            ...items,
            {
              i,
              x: 0,
              y: nextY(items),
              w: Math.min(def.defaultSize.w, COLS[bp]),
              h: def.defaultSize.h,
              minW: Math.min(def.minSize?.w ?? 2, COLS[bp]),
              minH: def.minSize?.h ?? 3,
            },
          ]
        }
        return next
      })
      setDirty(true)
    },
    []
  )

  const removeWidget = useCallback((i: string) => {
    setWorkWidgets((prev) => prev.filter((w) => w.i !== i))
    // Drop the item from every breakpoint that has a layout for it.
    setWorkLayouts((prev) => {
      const next: DashboardLayouts = {}
      for (const bp of BREAKPOINTS) {
        const items = prev[bp]
        if (items) next[bp] = items.filter((l) => l.i !== i)
      }
      return next
    })
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
      await save(activeId, { name: nameDraft, layout: workLayouts, widgets: workWidgets })
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save dashboard")
    } finally {
      setSaving(false)
    }
  }, [activeId, nameDraft, workLayouts, workWidgets, save])

  const handleToggleDefault = useCallback(async () => {
    if (!active) return
    setError(null)
    try {
      await save(active.id, { isDefault: !active.is_default })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update default dashboard")
    }
  }, [active, save])

  // "Add to dashboard" from a chat widget suggestion. Reuses the same code
  // path as the add-widget gallery; the suggested type must exist in the
  // registry and unknown/invalid config keys are dropped.
  const addSuggestedWidget = useCallback(
    (suggestion: ChatWidgetSuggestion): boolean => {
      if (!getWidgetDef(suggestion.type)) return false
      addWidget(suggestion.type, suggestionToWidgetConfig(suggestion.config, suggestion.title))
      // Enter edit mode so the new widget can be arranged and saved.
      setEditing(true)
      return true
    },
    [addWidget]
  )

  // Compact dashboard + dataset context for the chat assistant. Only built
  // while the chat is open; the dataset digest is cached per deals array.
  const dashboardContext = useMemo(() => {
    if (!chatOpen || !active) return undefined
    return buildDashboardContext(
      { name: nameDraft || active.name, widgets: workWidgets },
      initialDeals
    )
  }, [chatOpen, active, nameDraft, workWidgets, initialDeals])

  // react-grid-layout's WidthProvider only remeasures on window resize, so
  // nudge it when the chat column opens/closes and changes the canvas width.
  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    return () => window.clearTimeout(t)
  }, [chatOpen])

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
        <NewDashboardDialog
          onCreate={handleCreate}
          trigger={
            <button className="mt-6 inline-flex items-center gap-2 border-[3px] border-black bg-[#1A5D1A] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> New dashboard
            </button>
          }
        />
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mt-5 text-left" />}
      </div>
    )
  }

  // Guarantee an lg entry so RGL always has a base breakpoint to derive from.
  const layouts: DashboardLayouts = { lg: [], ...workLayouts }

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
              {d.is_default && (
                <Star className="mr-1 inline h-3 w-3 -translate-y-px fill-current" aria-label="Default dashboard" />
              )}
              {d.name}
            </button>
          ))}
          <NewDashboardDialog
            onCreate={handleCreate}
            trigger={
              <button className="inline-flex items-center gap-1 border-2 border-dashed border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-[#1A5D1A]/10">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            }
          />
        </div>

        <div className="flex items-center gap-2">
          {active && (
            <button
              onClick={handleToggleDefault}
              title={active.is_default ? "Default dashboard — click to unset" : "Set as default"}
              aria-label={active.is_default ? "Unset default dashboard" : "Set as default dashboard"}
              aria-pressed={active.is_default}
              className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-[#1A5D1A]/10"
            >
              <Star
                className={`h-3.5 w-3.5 ${active.is_default ? "fill-[#1A5D1A] text-[#1A5D1A]" : "text-gray-400"}`}
              />
            </button>
          )}
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
          <button
            onClick={() => setChatOpen((o) => !o)}
            aria-pressed={chatOpen}
            className={`inline-flex items-center gap-1 border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              chatOpen
                ? "bg-[#1A5D1A] text-white shadow-[2px_2px_0_#000]"
                : "bg-white hover:bg-[#1A5D1A]/10"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Chat
          </button>
        </div>
      </div>

      {/* Canvas + (desktop) chat column */}
      <div className="flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
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

        {/* Desktop chat column — kept mounted (hidden) so the conversation
            survives collapsing/reopening the panel. */}
        {!isMobile && (
          <div className={chatOpen ? "mt-4 hidden w-[380px] shrink-0 md:block" : "hidden"}>
            <div className="sticky top-4 h-[calc(100vh-6rem)] min-h-[420px]">
              <ChatPanel
                dashboardContext={dashboardContext}
                onAddWidget={addSuggestedWidget}
                onClose={() => setChatOpen(false)}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: chat opens in a right-side sheet instead of a column. */}
      {isMobile && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
            <SheetHeader className="sr-only">
              <SheetTitle>AI Chat</SheetTitle>
              <SheetDescription>
                Chat with the AI analyst about India&apos;s startup funding data.
              </SheetDescription>
            </SheetHeader>
            <ChatPanel
              dashboardContext={dashboardContext}
              onAddWidget={addSuggestedWidget}
              className="h-full border-0 shadow-none"
            />
          </SheetContent>
        </Sheet>
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
