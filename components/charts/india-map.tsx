"use client"

import { useMemo } from "react"
import type { FundingDeal as Deal } from "@/data/funding-data"
import { ViewDataLink } from "./view-data-link"

const CITY_COORDS: Record<string, [number, number]> = {
  "Bengaluru": [77.5946, 12.9716],
  "Bangalore": [77.5946, 12.9716],
  "Mumbai": [72.8777, 19.0760],
  "Delhi": [77.1025, 28.7041],
  "New Delhi": [77.2090, 28.6139],
  "Gurugram": [77.0266, 28.4595],
  "Noida": [77.3910, 28.5355],
  "Hyderabad": [78.4867, 17.3850],
  "Pune": [73.8567, 18.5204],
  "Chennai": [80.2707, 13.0827],
  "Kolkata": [88.3639, 22.5726],
  "Ahmedabad": [72.5714, 23.0225],
  "Jaipur": [75.7873, 26.9124],
  "Surat": [72.8311, 21.1702],
  "Indore": [75.8577, 22.7196],
  "Chandigarh": [76.7794, 30.7333],
  "Kochi": [76.2673, 9.9312],
  "Thiruvananthapuram": [76.9366, 8.5241],
  "Coimbatore": [76.9558, 11.0168],
  "Nagpur": [79.0882, 21.1458],
}

// Simple SVG India outline path (simplified)
const INDIA_VIEWBOX = "60 5 50 45"

function latLonToSvg(lon: number, lat: number): [number, number] {
  const x = (lon - 60) * (50 / 50)
  const y = 50 - (lat - 5) * (45 / 45)
  return [x, y]
}

export function IndiaMap({ deals, sourceLink }: { deals: Deal[]; sourceLink?: string }) {
  const cities = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const deal of deals) {
      const city = deal.location
      if (!city || !CITY_COORDS[city]) continue
      const cur = map.get(city) ?? { total: 0, count: 0 }
      map.set(city, { total: cur.total + deal.amount, count: cur.count + 1 })
    }
    const maxTotal = Math.max(...Array.from(map.values()).map((v) => v.total))
    return Array.from(map.entries()).map(([city, { total, count }]) => ({
      city,
      total: Math.round(total),
      count,
      coords: CITY_COORDS[city],
      r: 2 + (total / maxTotal) * 10,
    }))
  }, [deals])

  return (
    <div className="relative">
      <svg viewBox={INDIA_VIEWBOX} className="w-full h-auto max-h-96 bg-muted/20 rounded-lg">
        {/* India boundary placeholder — dots only */}
        {cities.map(({ city, coords, r, total, count }) => {
          const [x, y] = latLonToSvg(coords[0], coords[1])
          return (
            <g key={city}>
              <circle
                cx={x} cy={y} r={r}
                fill="hsl(var(--primary))" fillOpacity={0.7}
                stroke="hsl(var(--primary))" strokeWidth={0.3}
              >
                <title>{city}: ₹{total.toLocaleString("en-IN")} Cr · {count} deals</title>
              </circle>
              {r > 6 && (
                <text x={x} y={y - r - 1} textAnchor="middle" fontSize={1.8} fill="hsl(var(--foreground))" fillOpacity={0.8}>
                  {city}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {cities
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map(({ city, total, count }) => (
            <div key={city} className="text-xs rounded-md border px-2 py-1">
              <span className="font-medium">{city}</span>
              <span className="text-muted-foreground ml-1">₹{(total / 1000).toFixed(0)}K Cr · {count} deals</span>
            </div>
          ))}
      </div>
      <ViewDataLink href={sourceLink} />
    </div>
  )
}
