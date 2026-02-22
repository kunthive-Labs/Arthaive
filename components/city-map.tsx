"use client"
import { CITY_COORDINATES } from "@/lib/constants"

interface CityMapProps {
  data: Array<{ city: string; value: number }>
  title?: string
}

export function CityMap({ data, title }: CityMapProps) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="neo-border p-4">
      {title && <div className="text-xs font-bold uppercase text-gray-600 mb-4">{title}</div>}
      <div className="space-y-2">
        {data
          .filter(d => CITY_COORDINATES[d.city])
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map(d => (
            <div key={d.city} className="flex items-center gap-2">
              <span className="text-xs w-24 truncate font-semibold">{d.city}</span>
              <div className="flex-1 bg-gray-100 h-3">
                <div
                  className="bg-green-700 h-full transition-all"
                  style={{ width: `${(d.value / max) * 100}%` }}
                />
              </div>
              <span className="text-xs w-8 text-right">{d.value}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
