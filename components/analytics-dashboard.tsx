"use client"

import { useMemo } from "react"
import { isFundingDisclosed } from "@/lib/utils"
import type { Deal } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

export function AnalyticsDashboard({ deals }: { deals: Deal[] }) {
  const [
    fundingByMonth,
    fundingBySector,
    fundingByStage,
    topInvestors,
    dealCounts,
    yearlyComparison,
    quarterlyTrends,
    sectorDeepDive,
    locationAnalysis,
    avgDealByStage,
    velocityData,
    topDeals,
  ] = useMemo(() => {
    // Filter only disclosed amounts for monetary calculations
    const disclosedDeals = deals.filter((d) => isFundingDisclosed(d.amount))

    // Funding over time (only disclosed amounts)
    const monthMap = new Map<string, { amount: number; count: number; totalCount: number }>()
    deals.forEach((d) => {
      const month = new Date(d.date).toLocaleString("default", { month: "short", year: "2-digit" })
      const current = monthMap.get(month) || { amount: 0, count: 0, totalCount: 0 }
      monthMap.set(month, {
        amount: current.amount + (isFundingDisclosed(d.amount) ? d.amount : 0),
        count: current.count + (isFundingDisclosed(d.amount) ? 1 : 0),
        totalCount: current.totalCount + 1,
      })
    })
    const fundingOverTime = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        amount: Math.round(data.amount / 100),
        disclosedDeals: data.count,
        totalDeals: data.totalCount,
      }))
      .sort((a, b) => {
        // Sort by date
        const [monthA, yearA] = a.month.split(" ")
        const [monthB, yearB] = b.month.split(" ")
        const dateA = new Date(`20${yearA}-${monthA}-01`)
        const dateB = new Date(`20${yearB}-${monthB}-01`)
        return dateA.getTime() - dateB.getTime()
      })

    // By sector (only disclosed amounts)
    const sectorMap = new Map<string, { count: number; amount: number; totalDeals: number }>()
    deals.forEach((d) => {
      d.sectors.forEach((sector) => {
        const current = sectorMap.get(sector) || { count: 0, amount: 0, totalDeals: 0 }
        sectorMap.set(sector, {
          count: current.count + (isFundingDisclosed(d.amount) ? 1 : 0),
          amount: current.amount + (isFundingDisclosed(d.amount) ? d.amount : 0),
          totalDeals: current.totalDeals + 1,
        })
      })
    })
    const bySektor = Array.from(sectorMap.entries())
      .map(([name, { count, amount, totalDeals }]) => ({
        name,
        value: Math.round(amount / 100),
        deals: count,
        totalDeals,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // By stage (only disclosed amounts)
    const stageMap = new Map<string, { count: number; amount: number; totalDeals: number }>()
    deals.forEach((d) => {
      const current = stageMap.get(d.stage) || { count: 0, amount: 0, totalDeals: 0 }
      stageMap.set(d.stage, {
        count: current.count + (isFundingDisclosed(d.amount) ? 1 : 0),
        amount: current.amount + (isFundingDisclosed(d.amount) ? d.amount : 0),
        totalDeals: current.totalDeals + 1,
      })
    })
    // Funding rounds have ~70 distinct labels; a pie with that many slices
    // produces a legend that overflows the card. Keep the top 7 by funding
    // and fold the long tail into a single "Other rounds" slice.
    const byStageAll = Array.from(stageMap.entries())
      .map(([stage, { count, amount, totalDeals }]) => ({
        stage,
        count,
        amount: Math.round(amount / 100),
        totalDeals,
      }))
      .sort((a, b) => b.amount - a.amount)
    const TOP_STAGES = 7
    const headStages = byStageAll.slice(0, TOP_STAGES)
    const tailStages = byStageAll.slice(TOP_STAGES)
    const byStage =
      tailStages.length > 0
        ? [
            ...headStages,
            {
              stage: `Other (${tailStages.length} rounds)`,
              count: tailStages.reduce((s, d) => s + d.count, 0),
              amount: tailStages.reduce((s, d) => s + d.amount, 0),
              totalDeals: tailStages.reduce((s, d) => s + d.totalDeals, 0),
            },
          ]
        : headStages

    // Top investors (only disclosed amounts)
    const investorMap = new Map<string, { count: number; amount: number; totalDeals: number }>()
    deals.forEach((d) => {
      d.investors.forEach((inv) => {
        const current = investorMap.get(inv) || { count: 0, amount: 0, totalDeals: 0 }
        investorMap.set(inv, {
          count: current.count + (isFundingDisclosed(d.amount) ? 1 : 0),
          amount: current.amount + (isFundingDisclosed(d.amount) ? d.amount : 0),
          totalDeals: current.totalDeals + 1,
        })
      })
    })
    const topInv = Array.from(investorMap.entries())
      .map(([name, { count, amount, totalDeals }]) => ({
        name,
        deals: count,
        amount: Math.round(amount / 100),
        totalDeals,
      }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 10)

    // Deal count summary
    const counts = {
      total: deals.length,
      disclosed: disclosedDeals.length,
      undisclosed: deals.length - disclosedDeals.length,
    }

    // Year-over-Year Analysis
    const yearMap = new Map<string, { amount: number; count: number; avgDeal: number }>()
    disclosedDeals.forEach((d) => {
      const year = new Date(d.date).getFullYear().toString()
      const current = yearMap.get(year) || { amount: 0, count: 0, avgDeal: 0 }
      yearMap.set(year, {
        amount: current.amount + d.amount,
        count: current.count + 1,
        avgDeal: 0,
      })
    })
    const yoyData = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        amount: Math.round(data.amount / 100),
        deals: data.count,
        avgDeal: Math.round(data.amount / data.count / 100),
      }))
      .sort((a, b) => Number(a.year) - Number(b.year))

    // Quarter-wise Analysis
    const quarterMap = new Map<string, { amount: number; count: number }>()
    disclosedDeals.forEach((d) => {
      const date = new Date(d.date)
      const year = date.getFullYear()
      const month = date.getMonth()
      const quarter = Math.floor(month / 3) + 1
      const key = `Q${quarter} ${year}`
      const current = quarterMap.get(key) || { amount: 0, count: 0 }
      quarterMap.set(key, {
        amount: current.amount + d.amount,
        count: current.count + 1,
      })
    })
    const quarterData = Array.from(quarterMap.entries())
      .map(([quarter, data]) => ({
        quarter,
        amount: Math.round(data.amount / 100),
        deals: data.count,
      }))
      .sort((a, b) => {
        const [qA, yA] = a.quarter.split(" ")
        const [qB, yB] = b.quarter.split(" ")
        return Number(yA) - Number(yB) || Number(qA.replace("Q", "")) - Number(qB.replace("Q", ""))
      })
      .slice(-12) // Last 12 quarters

    // Sector Deep Dive with more metrics
    const sectorMetrics = Array.from(sectorMap.entries())
      .map(([name, { count, amount, totalDeals }]) => ({
        name,
        amount: Math.round(amount / 100),
        deals: count,
        totalDeals,
        avgDeal: count > 0 ? Math.round(amount / count / 100) : 0,
        dealShare: ((count / disclosedDeals.length) * 100).toFixed(1),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15)

    // Location Analysis
    const locationMap = new Map<string, { amount: number; count: number }>()
    disclosedDeals.forEach((d) => {
      const current = locationMap.get(d.location) || { amount: 0, count: 0 }
      locationMap.set(d.location, {
        amount: current.amount + d.amount,
        count: current.count + 1,
      })
    })
    const locationData = Array.from(locationMap.entries())
      .map(([location, data]) => ({
        location,
        amount: Math.round(data.amount / 100),
        deals: data.count,
        avgDeal: Math.round(data.amount / data.count / 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Average Deal Size by Stage
    const avgDealByStage = Array.from(stageMap.entries())
      .map(([stage, data]) => ({
        stage,
        avgDeal: data.count > 0 ? Math.round(data.amount / data.count / 100) : 0,
        deals: data.count,
      }))
      .filter((d) => d.deals > 0)
      .sort((a, b) => b.avgDeal - a.avgDeal)

    // Deal Velocity (deals per month over time)
    const velocityData = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        deals: data.totalCount,
        disclosed: data.count,
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(" ")
        const [monthB, yearB] = b.month.split(" ")
        const dateA = new Date(`20${yearA}-${monthA}-01`)
        const dateB = new Date(`20${yearB}-${monthB}-01`)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(-24) // Last 24 months

    // Top 10 Largest Deals
    const topDeals = disclosedDeals
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((d) => ({
        company: d.company,
        amount: Math.round(d.amount / 100),
        stage: d.stage,
        sector: d.sectors[0],
        date: d.date,
      }))

    return [
      fundingOverTime,
      bySektor,
      byStage,
      topInv,
      counts,
      yoyData,
      quarterData,
      sectorMetrics,
      locationData,
      avgDealByStage,
      velocityData,
      topDeals,
    ]
  }, [deals])

  const colors = ["#1A5D1A", "#FF5A1F", "#0C3A12", "#4ABD4A", "#FFB100", "#1F8A3B", "#7AED7A", "#9CA38F"]
  const stageTotal = fundingByStage.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="py-12 space-y-12">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="neo-border neo-shadow-sm p-6 bg-white">
          <div className="text-2xl font-bold text-green-700 mb-1">{dealCounts.total}</div>
          <div className="text-xs font-bold uppercase text-gray-600">Total Deals Tracked</div>
        </div>
        <div className="neo-border neo-shadow-sm p-6 bg-white">
          <div className="text-2xl font-bold text-green-700 mb-1">{dealCounts.disclosed}</div>
          <div className="text-xs font-bold uppercase text-gray-600">Disclosed Amounts</div>
          <div className="text-xs text-gray-500 mt-1">{((dealCounts.disclosed / dealCounts.total) * 100).toFixed(1)}%</div>
        </div>
        <div className="neo-border neo-shadow-sm p-6 bg-white">
          <div className="text-2xl font-bold text-orange-600 mb-1">{dealCounts.undisclosed}</div>
          <div className="text-xs font-bold uppercase text-gray-600">Undisclosed Amounts</div>
          <div className="text-xs text-gray-500 mt-1">{((dealCounts.undisclosed / dealCounts.total) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Funding Over Time */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">FUNDING OVER TIME</h3>
        <p className="text-xs text-gray-600 mb-6">Showing only disclosed amounts</p>
        <ResponsiveContainer width="100%" minWidth={0} height={350}>
          <LineChart data={fundingByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#000" style={{ fontSize: "12px" }} interval="preserveStartEnd" minTickGap={28} />
            <YAxis stroke="#000" width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
              formatter={(value, name) => {
                if (name === "amount") return [`₹${value}Cr`, "Funding Amount"]
                return [value, name]
              }}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#1A5D1A"
              strokeWidth={3}
              name="Funding Amount (₹Cr)"
              dot={{ fill: "#1A5D1A", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sector Breakdown */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">TOP 10 SECTORS BY FUNDING</h3>
        <p className="text-xs text-gray-600 mb-6">Disclosed amounts only</p>
        <ResponsiveContainer width="100%" minWidth={0} height={400}>
          <BarChart data={fundingBySector} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#000" label={{ value: "Amount (₹ Cr)", position: "bottom" }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#000"
              width={150}
              style={{ fontSize: "11px" }}
              tick={{ fill: "#000" }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
              formatter={(value, name) => {
                if (name === "value") return [`₹${value}Cr`, "Total Funding"]
                if (name === "deals") return [value, "Disclosed Deals"]
                return [value, name]
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="#1A5D1A" name="Funding (₹Cr)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stage Distribution */}
        <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-2 text-green-700">FUNDING BY STAGE</h3>
          <p className="text-xs text-gray-600 mb-6">Disclosed amounts · top 7 rounds</p>
          <ResponsiveContainer width="100%" minWidth={0} height={260}>
            <PieChart>
              <Pie
                data={fundingByStage}
                dataKey="amount"
                nameKey="stage"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                paddingAngle={1}
                label={({ percent }) =>
                  (percent ?? 0) >= 0.06 ? `${(((percent ?? 0)) * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {fundingByStage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#000" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0", boxShadow: "4px 4px 0 #000", fontWeight: 600 }}
                formatter={(value: number, name, props) => {
                  const share = stageTotal ? ((value / stageTotal) * 100).toFixed(1) : "0"
                  return [`₹${value.toLocaleString("en-IN")}Cr · ${share}%`, props?.payload?.stage]
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Controlled legend — never overflows the card */}
          <ul className="mt-5 grid grid-cols-1 gap-x-5 gap-y-2 border-t-2 border-black pt-4 sm:grid-cols-2">
            {fundingByStage.map((entry, index) => {
              const share = stageTotal ? ((entry.amount / stageTotal) * 100).toFixed(1) : "0"
              return (
                <li key={entry.stage} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 border border-black"
                    style={{ backgroundColor: colors[index % colors.length] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold" title={entry.stage}>
                    {entry.stage}
                  </span>
                  <span className="ledger-figure flex-shrink-0 font-bold text-green-700">
                    ₹{entry.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="ledger-figure w-10 flex-shrink-0 text-right text-gray-500">{share}%</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Top Investors */}
        <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-2 text-green-700">TOP 10 ACTIVE INVESTORS</h3>
          <p className="text-xs text-gray-600 mb-6">Ranked by number of deals</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topInvestors.map((inv, i) => (
              <div key={inv.name} className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-bold text-sm w-8 text-center text-green-700 flex-shrink-0">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{inv.name}</div>
                    <div className="text-xs text-gray-600">
                      {inv.deals} disclosed ({inv.totalDeals} total)
                    </div>
                  </div>
                </div>
                <div className="font-bold text-green-700 text-sm ml-2 flex-shrink-0">₹{inv.amount}Cr</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Year-over-Year Comparison */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">YEAR-OVER-YEAR COMPARISON</h3>
        <p className="text-xs text-gray-600 mb-6">Funding trends and deal activity by year</p>
        <ResponsiveContainer width="100%" minWidth={0} height={350}>
          <BarChart data={yearlyComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="year" stroke="#000" />
            <YAxis yAxisId="left" stroke="#000" label={{ value: "Amount (₹ Cr)", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" stroke="#000" label={{ value: "Deals", angle: 90, position: "insideRight" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
              formatter={(value, name) => {
                if (name === "amount") return [`₹${value}Cr`, "Total Funding"]
                if (name === "avgDeal") return [`₹${value}Cr`, "Avg Deal Size"]
                return [value, "Deals"]
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="amount" fill="#1A5D1A" name="Funding (₹Cr)" />
            <Bar yAxisId="right" dataKey="deals" fill="#FF5A1F" name="Number of Deals" />
          </BarChart>
        </ResponsiveContainer>

        {/* YoY Growth Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {yearlyComparison.map((year, idx) => {
            if (idx === 0) return null
            const prevYear = yearlyComparison[idx - 1]
            const growth = ((year.amount - prevYear.amount) / prevYear.amount * 100).toFixed(1)
            const dealGrowth = ((year.deals - prevYear.deals) / prevYear.deals * 100).toFixed(1)
            return (
              <div key={year.year} className="border-[3px] border-black bg-white p-4">
                <div className="text-xs font-bold text-gray-600">{year.year} vs {prevYear.year}</div>
                <div className={`text-lg font-bold ${Number(growth) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {Number(growth) >= 0 ? '+' : ''}{growth}%
                </div>
                <div className="text-xs text-gray-600">Funding Growth</div>
                <div className={`text-sm font-bold mt-1 ${Number(dealGrowth) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {Number(dealGrowth) >= 0 ? '+' : ''}{dealGrowth}% Deals
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quarter-wise Trends */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">QUARTERLY FUNDING TRENDS</h3>
        <p className="text-xs text-gray-600 mb-6">Last 12 quarters performance</p>
        <ResponsiveContainer width="100%" minWidth={0} height={350}>
          <LineChart data={quarterlyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="quarter" stroke="#000" style={{ fontSize: "11px" }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#000" />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
              formatter={(value, name) => {
                if (name === "amount") return [`₹${value}Cr`, "Funding"]
                return [value, "Deals"]
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#1A5D1A" strokeWidth={3} name="Funding (₹Cr)" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="deals" stroke="#FF5A1F" strokeWidth={2} name="Deals" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sector Deep Dive */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">SECTOR DEEP DIVE</h3>
        <p className="text-xs text-gray-600 mb-6">Top 15 sectors with detailed metrics</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-2 font-bold">#</th>
                <th className="text-left py-3 px-2 font-bold">Sector</th>
                <th className="text-right py-3 px-2 font-bold">Funding (₹Cr)</th>
                <th className="text-right py-3 px-2 font-bold">Deals</th>
                <th className="text-right py-3 px-2 font-bold">Avg Deal (₹Cr)</th>
                <th className="text-right py-3 px-2 font-bold">Deal Share</th>
              </tr>
            </thead>
            <tbody>
              {sectorDeepDive.map((sector, idx) => (
                <tr key={sector.name} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 font-bold text-green-700">{idx + 1}</td>
                  <td className="py-3 px-2 font-semibold">{sector.name}</td>
                  <td className="py-3 px-2 text-right font-bold text-green-700">₹{sector.amount}</td>
                  <td className="py-3 px-2 text-right">{sector.deals}</td>
                  <td className="py-3 px-2 text-right">₹{sector.avgDeal}</td>
                  <td className="py-3 px-2 text-right text-gray-600">{sector.dealShare}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">TOP CITIES BY FUNDING</h3>
        <p className="text-xs text-gray-600 mb-6">Geographic distribution of startup funding</p>
        <ResponsiveContainer width="100%" minWidth={0} height={400}>
          <BarChart data={locationAnalysis} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#000" />
            <YAxis type="category" dataKey="location" stroke="#000" width={100} style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
              formatter={(value, name) => {
                if (name === "amount") return [`₹${value}Cr`, "Total Funding"]
                if (name === "avgDeal") return [`₹${value}Cr`, "Avg Deal"]
                return [value, "Deals"]
              }}
            />
            <Legend />
            <Bar dataKey="amount" fill="#1A5D1A" name="Funding (₹Cr)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Average Deal Size by Stage */}
        <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-2 text-green-700">AVG DEAL SIZE BY STAGE</h3>
          <p className="text-xs text-gray-600 mb-6">Average funding amount per stage</p>
          <ResponsiveContainer width="100%" minWidth={0} height={350}>
            <BarChart data={avgDealByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="stage" stroke="#000" style={{ fontSize: "11px" }} />
              <YAxis stroke="#000" label={{ value: "Avg Deal (₹ Cr)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
                formatter={(value, name) => {
                  if (name === "avgDeal") return [`₹${value}Cr`, "Average Deal Size"]
                  return [value, "Deals"]
                }}
              />
              <Legend />
              <Bar dataKey="avgDeal" fill="#FF5A1F" name="Avg Deal (₹Cr)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Velocity */}
        <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-2 text-green-700">DEAL VELOCITY TREND</h3>
          <p className="text-xs text-gray-600 mb-6">Number of deals per month (last 24 months)</p>
          <ResponsiveContainer width="100%" minWidth={0} height={350}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#000" style={{ fontSize: "10px" }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#000" />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "3px solid #000", borderRadius: "0" }}
                formatter={(value, name) => {
                  if (name === "deals") return [value, "Total Deals"]
                  return [value, "Disclosed Deals"]
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="deals" stroke="#1A5D1A" strokeWidth={3} name="Total Deals" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="disclosed" stroke="#3A9D3A" strokeWidth={2} name="Disclosed" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Largest Deals Table */}
      <div className="neo-border neo-shadow p-6 md:p-8 bg-white">
        <h3 className="text-lg font-bold uppercase mb-2 text-green-700">TOP 10 LARGEST DEALS</h3>
        <p className="text-xs text-gray-600 mb-6">Biggest funding rounds by amount</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-2 font-bold">#</th>
                <th className="text-left py-3 px-2 font-bold">Company</th>
                <th className="text-left py-3 px-2 font-bold">Sector</th>
                <th className="text-left py-3 px-2 font-bold">Stage</th>
                <th className="text-right py-3 px-2 font-bold">Amount (₹Cr)</th>
                <th className="text-right py-3 px-2 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {topDeals.map((deal, idx) => (
                <tr key={deal.company} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 font-bold text-green-700">{idx + 1}</td>
                  <td className="py-3 px-2 font-bold">{deal.company}</td>
                  <td className="py-3 px-2">{deal.sector}</td>
                  <td className="py-3 px-2">
                    <span className="bg-green-700 text-white px-2 py-1 text-xs font-bold">{deal.stage}</span>
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-green-700">₹{deal.amount}</td>
                  <td className="py-3 px-2 text-right text-gray-600">{new Date(deal.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
