"use client"

import { useMemo, useState } from "react"
import type { FundingDeal } from "@/data/funding-data"
import type { KpiMetric, WidgetConfig } from "@/lib/dashboard/types"
import type { WidgetDefinition } from "@/lib/dashboard/widget-registry"
import { allSectors, allStages, yearRange } from "@/lib/dashboard/filter-deals"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const KPI_METRICS: { value: KpiMetric; label: string }[] = [
  { value: "total_capital", label: "Total capital" },
  { value: "deal_count", label: "Deal count" },
  { value: "avg_round", label: "Average round" },
  { value: "unique_investors", label: "Unique investors" },
  { value: "unique_sectors", label: "Unique sectors" },
  { value: "unique_cities", label: "Unique cities" },
  { value: "largest_round", label: "Largest round" },
]

const TOP_N_OPTIONS = [5, 10, 12, 15, 20, 25]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{children}</div>
  )
}

function MultiCheck({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [q, setQ] = useState("")
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter…"
        className="mb-1 w-full border-2 border-black px-2 py-1 text-xs"
      />
      <div className="max-h-40 overflow-auto border-2 border-black p-2">
        {shown.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
            <span className="truncate">{o}</span>
          </label>
        ))}
        {!shown.length && <div className="text-xs text-gray-400">No matches</div>}
      </div>
    </div>
  )
}

export function WidgetSettings({
  def,
  config,
  deals,
  onChange,
}: {
  def: WidgetDefinition
  config: WidgetConfig
  deals: FundingDeal[]
  onChange: (next: WidgetConfig) => void
}) {
  const sectors = useMemo(() => allSectors(deals), [deals])
  const stages = useMemo(() => allStages(deals), [deals])
  const [minYear, maxYear] = useMemo(() => yearRange(deals), [deals])
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear]
  )

  const set = (patch: Partial<WidgetConfig>) => onChange({ ...config, ...patch })

  const toggleIn = (key: "sectors" | "stages", value: string) => {
    const cur = config[key] ?? []
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    set({ [key]: next.length ? next : undefined } as Partial<WidgetConfig>)
  }

  return (
    <div className="space-y-3">
      {def.filters.includes("metric") && (
        <div>
          <FieldLabel>Metric</FieldLabel>
          <Select
            value={config.metric ?? ""}
            onValueChange={(v) => set({ metric: v as KpiMetric })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {KPI_METRICS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {def.filters.includes("topN") && (
        <div>
          <FieldLabel>Show top</FieldLabel>
          <Select
            value={String(config.topN ?? "")}
            onValueChange={(v) => set({ topN: Number(v) })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {TOP_N_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  Top {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {def.filters.includes("years") && (
        <div>
          <FieldLabel>Year range</FieldLabel>
          <div className="flex items-center gap-2">
            <Select
              value={String(config.yearFrom ?? "")}
              onValueChange={(v) => set({ yearFrom: v ? Number(v) : undefined })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="From" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-400">—</span>
            <Select
              value={String(config.yearTo ?? "")}
              onValueChange={(v) => set({ yearTo: v ? Number(v) : undefined })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="To" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {def.filters.includes("sectors") && (
        <div>
          <FieldLabel>Sectors {config.sectors?.length ? `(${config.sectors.length})` : ""}</FieldLabel>
          <MultiCheck options={sectors} selected={config.sectors ?? []} onToggle={(v) => toggleIn("sectors", v)} />
        </div>
      )}

      {def.filters.includes("stages") && (
        <div>
          <FieldLabel>Stages {config.stages?.length ? `(${config.stages.length})` : ""}</FieldLabel>
          <MultiCheck options={stages} selected={config.stages ?? []} onToggle={(v) => toggleIn("stages", v)} />
        </div>
      )}

      <div>
        <FieldLabel>Custom title</FieldLabel>
        <input
          value={config.title ?? ""}
          onChange={(e) => set({ title: e.target.value || undefined })}
          placeholder={def.label}
          className="w-full border-2 border-black px-2 py-1 text-xs"
        />
      </div>

      <button
        onClick={() => onChange({})}
        className="text-[11px] font-semibold text-red-600 hover:underline"
      >
        Reset filters
      </button>
    </div>
  )
}
