"use client"
import { SECTOR_COLORS } from "@/lib/constants"
import { formatCompact } from "@/lib/utils"

interface SectorTreeProps {
  data: Array<{ sector: string; value: number }>
  title?: string
}

export function SectorTree({ data, title }: SectorTreeProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="neo-border p-4">
      {title && <div className="text-xs font-bold uppercase text-gray-600 mb-4">{title}</div>}
      <div className="flex flex-wrap gap-1">
        {data
          .sort((a, b) => b.value - a.value)
          .map(d => {
            const pct = (d.value / total) * 100
            const size = Math.max(pct, 4)
            const color = SECTOR_COLORS[d.sector] ?? "#6b7280"
            return (
              <div
                key={d.sector}
                title={`${d.sector}: ${formatCompact(d.value)}`}
                className="flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                style={{ width: `${size}%`, minWidth: 40, height: Math.max(size * 1.5, 32), backgroundColor: color }}
              >
                {pct > 6 ? d.sector : ""}
              </div>
            )
          })}
      </div>
    </div>
  )
}
