import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { MonthlyFunding, SectorStat, CityFunding, StageStat, SiteStats } from "@/lib/types"

// ---------------------------------------------------------------------------
// Internal helper: fetch all deals from Supabase or fall back to static data
// Returns a lightweight shape sufficient for aggregation (avoids over-fetching)
// ---------------------------------------------------------------------------
interface RawDeal {
  amount_inr: number
  deal_date: string
  sectors: string[]
  stage: string
  location: string
  investors: string[]
  company: string
  record_status?: string
}

async function fetchAll(): Promise<RawDeal[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("deals")
      .select("company,amount_inr,deal_date,sectors,stage,location,investors,record_status")
      .eq("record_status", "verified")
      .order("deal_date", { ascending: false })

    if (!error && data && data.length > 0) {
      return data as RawDeal[]
    }
  }

  return fundingData.map((d) => ({
    company: d.company,
    amount_inr: d.amount,
    deal_date: d.date,
    sectors: d.sectors,
    stage: d.stage,
    location: d.location,
    investors: d.investors,
  }))
}

// ---------------------------------------------------------------------------
// getSiteStats
// ---------------------------------------------------------------------------
export async function getSiteStats(): Promise<SiteStats> {
  const data = await fetchAll()

  const disclosedDeals = data.filter((d) => d.amount_inr > 0)
  const totalFunding = disclosedDeals.reduce((sum, d) => sum + d.amount_inr, 0)

  const sectorCounts = new Map<string, number>()
  data.forEach((d) => d.sectors.forEach((s) => sectorCounts.set(s, (sectorCounts.get(s) || 0) + 1)))
  const topSectorEntry = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  const largestDeal = disclosedDeals.reduce(
    (max, d) => (d.amount_inr > max.amount_inr ? d : max),
    disclosedDeals[0] || { company: "N/A", amount_inr: 0 }
  )

  const allInvestors = new Set(
    data
      .flatMap((d) => d.investors)
      .filter((i) => i && i !== "Not Disclosed" && i !== "Undisclosed")
  )

  return {
    totalDeals: data.length,
    totalDisclosedFunding: totalFunding,
    disclosedDealsCount: disclosedDeals.length,
    topSector: topSectorEntry?.[0] || "",
    topSectorCount: topSectorEntry?.[1] || 0,
    largestDealCompany: largestDeal.company,
    largestDealAmount: largestDeal.amount_inr,
    uniqueInvestors: allInvestors.size,
    uniqueCities: new Set(data.map((d) => d.location)).size,
    uniqueSectors: sectorCounts.size,
    lastUpdated: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// getMonthlyFunding
// ---------------------------------------------------------------------------
export async function getMonthlyFunding(months = 24): Promise<MonthlyFunding[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const sinceStr = since.toISOString().split("T")[0]

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("deals")
      .select("deal_date,amount_inr")
      .eq("record_status", "verified")
      .gte("deal_date", sinceStr)
      .order("deal_date", { ascending: true })

    if (!error && data && data.length > 0) {
      return aggregateMonthly(
        data.map((r: { deal_date: string; amount_inr: number }) => ({
          date: r.deal_date,
          amount: r.amount_inr,
        }))
      )
    }
  }

  const filtered = fundingData
    .filter((d) => d.date >= sinceStr)
    .map((d) => ({ date: d.date, amount: d.amount }))

  return aggregateMonthly(filtered)
}

function aggregateMonthly(data: { date: string; amount: number }[]): MonthlyFunding[] {
  const byMonth = new Map<string, { total: number; count: number }>()
  for (const { date, amount } of data) {
    const month = date.substring(0, 7)
    const existing = byMonth.get(month) || { total: 0, count: 0 }
    byMonth.set(month, { total: existing.total + amount, count: existing.count + 1 })
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { total, count }]) => ({
      month,
      totalFunding: total,
      dealCount: count,
      avgDealSize: count > 0 ? total / count : 0,
    }))
}

// ---------------------------------------------------------------------------
// getSectorStats
// ---------------------------------------------------------------------------
export async function getSectorStats(): Promise<SectorStat[]> {
  const data = await fetchAll()
  const total = data.length
  const sectorMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    for (const sector of deal.sectors) {
      const existing = sectorMap.get(sector) || { count: 0, funding: 0 }
      sectorMap.set(sector, { count: existing.count + 1, funding: existing.funding + deal.amount_inr })
    }
  }

  return [...sectorMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([sector, { count, funding }]) => ({
      sector,
      dealCount: count,
      totalFunding: funding,
      avgDealSize: count > 0 ? funding / count : 0,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
}

// ---------------------------------------------------------------------------
// getCityFunding
// ---------------------------------------------------------------------------
export async function getCityFunding(limit = 15): Promise<CityFunding[]> {
  const data = await fetchAll()
  const cityMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    const existing = cityMap.get(deal.location) || { count: 0, funding: 0 }
    cityMap.set(deal.location, {
      count: existing.count + 1,
      funding: existing.funding + deal.amount_inr,
    })
  }

  return [...cityMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([city, { count, funding }]) => ({ city, dealCount: count, totalFunding: funding }))
}

// ---------------------------------------------------------------------------
// getStageDistribution
// ---------------------------------------------------------------------------
export async function getStageDistribution(): Promise<StageStat[]> {
  const data = await fetchAll()
  const total = data.length
  const stageMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    const existing = stageMap.get(deal.stage) || { count: 0, funding: 0 }
    stageMap.set(deal.stage, {
      count: existing.count + 1,
      funding: existing.funding + deal.amount_inr,
    })
  }

  return [...stageMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([stage, { count, funding }]) => ({
      stage,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      totalFunding: funding,
    }))
}

// ---------------------------------------------------------------------------
// getYoYComparison
// ---------------------------------------------------------------------------
export async function getYoYComparison(): Promise<
  { year: string; totalFunding: number; dealCount: number }[]
> {
  const data = await fetchAll()
  const yearMap = new Map<string, { funding: number; count: number }>()

  for (const deal of data) {
    const year = deal.deal_date.substring(0, 4)
    const existing = yearMap.get(year) || { funding: 0, count: 0 }
    yearMap.set(year, {
      funding: existing.funding + deal.amount_inr,
      count: existing.count + 1,
    })
  }

  return [...yearMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { funding, count }]) => ({ year, totalFunding: funding, dealCount: count }))
}

// ---------------------------------------------------------------------------
// getTopInvestorsByActivity
// ---------------------------------------------------------------------------
export async function getTopInvestorsByActivity(
  limit = 10
): Promise<{ name: string; dealCount: number; totalDeployed: number }[]> {
  const data = await fetchAll()
  const map = new Map<string, { count: number; deployed: number }>()

  for (const deal of data) {
    for (const investor of deal.investors) {
      if (!investor || investor === "Not Disclosed" || investor === "Undisclosed") continue
      const existing = map.get(investor) || { count: 0, deployed: 0 }
      map.set(investor, {
        count: existing.count + 1,
        deployed: existing.deployed + deal.amount_inr,
      })
    }
  }

  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, { count, deployed }]) => ({ name, dealCount: count, totalDeployed: deployed }))
}

// ---------------------------------------------------------------------------
// getMonthlyFundingByYear — for the YoY chart: monthly breakdown per year
// ---------------------------------------------------------------------------
export async function getMonthlyFundingByYear(
  year: number
): Promise<{ month: string; totalFunding: number; dealCount: number }[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("deals")
      .select("deal_date,amount_inr")
      .eq("record_status", "verified")
      .gte("deal_date", startDate)
      .lte("deal_date", endDate)
      .order("deal_date", { ascending: true })

    if (!error && data && data.length > 0) {
      return aggregateMonthly(
        data.map((r: { deal_date: string; amount_inr: number }) => ({
          date: r.deal_date,
          amount: r.amount_inr,
        }))
      )
    }
  }

  return aggregateMonthly(
    fundingData
      .filter((d) => d.date >= startDate && d.date <= endDate)
      .map((d) => ({ date: d.date, amount: d.amount }))
  )
}

// ---------------------------------------------------------------------------
// getCoverageRange — earliest and latest verified deal dates
// Used by the CoverageNotice component
// ---------------------------------------------------------------------------
export async function getCoverageRange(): Promise<{ earliest: string; latest: string; total: number }> {
  if (isSupabaseConfigured && supabase) {
    const [earliestRes, latestRes, countRes] = await Promise.all([
      supabase
        .from("deals")
        .select("deal_date")
        .eq("record_status", "verified")
        .order("deal_date", { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from("deals")
        .select("deal_date")
        .eq("record_status", "verified")
        .order("deal_date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("record_status", "verified"),
    ])

    if (!earliestRes.error && !latestRes.error) {
      return {
        earliest: (earliestRes.data as { deal_date: string }).deal_date,
        latest: (latestRes.data as { deal_date: string }).deal_date,
        total: countRes.count || 0,
      }
    }
  }

  const dates = fundingData.map((d) => d.date).sort()
  return {
    earliest: dates[0] || "",
    latest: dates[dates.length - 1] || "",
    total: fundingData.length,
  }
}
