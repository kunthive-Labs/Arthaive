"use client"

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Investor } from "@/lib/types"

const COLORS = ["#15803d", "#1d4ed8", "#7c3aed", "#b45309", "#dc2626", "#0891b2", "#db2777"]

interface InvestorStatsProps {
  investor: Investor
}

export function InvestorStats({ investor }: InvestorStatsProps) {
  const stageData = investor.stages.map((stage, i) => ({
    name: stage,
    value: investor.deals?.filter((d) => d.stage === stage).length || 1,
    color: COLORS[i % COLORS.length],
  }))

  const sectorData = investor.sectors.slice(0, 8).map((sector) => ({
    name: sector.length > 15 ? sector.substring(0, 15) + "…" : sector,
    count: investor.deals?.filter((d) => d.sectors.includes(sector)).length || 1,
  }))

  const cityData = investor.cities.slice(0, 8).map((city) => ({
    name: city,
    count: investor.deals?.filter((d) => d.location === city).length || 1,
  })).sort((a, b) => b.count - a.count)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stageData.length > 0 && (
        <div className="neo-border p-4">
          <h4 className="font-bold text-sm uppercase mb-4">Stage Focus</h4>
          <ResponsiveContainer width="100%" minWidth={0} height={160}>
            <PieChart>
              <Pie data={stageData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                {stageData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {stageData.map((s, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sectorData.length > 0 && (
        <div className="neo-border p-4">
          <h4 className="font-bold text-sm uppercase mb-4">Sectors</h4>
          <ResponsiveContainer width="100%" minWidth={0} height={160}>
            <BarChart data={sectorData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#15803d" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cityData.length > 0 && (
        <div className="neo-border p-4">
          <h4 className="font-bold text-sm uppercase mb-4">Cities</h4>
          <div className="space-y-2">
            {cityData.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{c.name}</span>
                <span className="font-bold text-green-700 flex-shrink-0 ml-2">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
