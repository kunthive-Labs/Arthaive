"use client"
import type { ExportFormat } from "@/lib/types"
import { EXPORT_FORMATS } from "@/lib/constants"

interface ExportButtonProps { onExport: (format: ExportFormat) => void; disabled?: boolean }

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
  return (
    <div className="relative group inline-block">
      <button disabled={disabled} className="px-4 py-2 text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50">
        Export
      </button>
      <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black hidden group-hover:block z-10 min-w-[100px]">
        {EXPORT_FORMATS.map(f => (
          <button key={f.value} onClick={() => onExport(f.value)} className="block w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-100">
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
