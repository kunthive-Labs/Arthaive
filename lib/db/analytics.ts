import { unstable_cache } from "next/cache"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { MonthlyFunding, SectorStat, CityFunding, StageStat, SiteStats } from "@/lib/types"

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------
// Site-wide aggregations change only when the dataset is re-ingested (a rare,
// out-of-band event), so identical requests within a window can safely reuse a
// memoised result instead of re-hitting Postgres. We wrap each DB-backed
// aggregation in unstable_cache with a shared tag + a modest TTL.
//
// NOTE FOR ROUTE OWNERS (files outside this agent's ownership set): the API
// routes that call these functions (app/api/analytics, app/api/stats,
// app/api/sectors, app/api/v1/trends/*) should add
//   export const revalidate = 3600
// so the route segment cache lines up with the data revalidation below.
const ANALYTICS_TAG = "analytics"
const ANALYTICS_TTL = 3600 // seconds

function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[]
): (...args: A) => Promise<R> {
  // unstable_cache requires Next's incremental cache context, which only
  // exists inside the Next.js server runtime. When Supabase isn't configured
  // (tests, local dev without a DB) every cached body short-circuits to the
  // static fallback anyway, and invoking unstable_cache there throws
  // "incrementalCache missing". Skip the wrapper in that case so the
  // static-data path stays exercisable outside the Next runtime.
  if (!isSupabaseConfigured) return fn
  return unstable_cache(fn, keyParts, { revalidate: ANALYTICS_TTL, tags: [ANALYTICS_TAG] })
}

// Supabase caps a single select at 1000 rows. With ~13k+ verified deals, the
// monthly-trend paths that still stream raw (deal_date, amount_inr) rows MUST
// page through .range() or they silently under-count. The site-wide
// aggregations (sector/city/stage/year/investor/site-stats) no longer page —
// they push the group-by into Postgres via the v_analytics_* views and the
// get_site_stats() RPC (see 020_analytics_views.sql).
const PAGE = 1000

// Page through a date-filtered (deal_date,amount_inr) projection — same 1000-row
// cap concern, used by the monthly-trend aggregations. When `sector` is given,
// only deals whose `sectors` array contains it are counted (DB-side array filter).
async function fetchDatedRows(
  sinceStr: string,
  sector?: string
): Promise<{ date: string; amount: number }[]> {
  const all: { date: string; amount: number }[] = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase!
      .from("deals")
      .select("deal_date,amount_inr")
      .eq("record_status", "verified")
      .gte("deal_date", sinceStr)
    if (sector) query = query.contains("sectors", [sector])
    const { data, error } = await query
      .order("deal_date", { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) break
    if (data && data.length)
      all.push(
        ...data.map((r: { deal_date: string; amount_inr: number }) => ({
          date: r.deal_date,
          amount: r.amount_inr,
        }))
      )
    if (!data || data.length < PAGE) break
  }
  return all
}

// ---------------------------------------------------------------------------
// getSiteStats — single-row scalar rollup via get_site_stats() RPC
// ---------------------------------------------------------------------------
interface SiteStatsRow {
  total_deals: number
  total_disclosed_funding: number
  disclosed_deals_count: number
  top_sector: string
  top_sector_count: number
  largest_deal_company: string
  largest_deal_amount: number
  unique_investors: number
  unique_cities: number
  unique_sectors: number
}

const getSiteStatsCached = cached(async (): Promise<Omit<SiteStats, "lastUpdated"> | null> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("get_site_stats")
    const row = (data as SiteStatsRow[] | null)?.[0]
    if (!error && row) {
      return {
        totalDeals: Number(row.total_deals),
        totalDisclosedFunding: Number(row.total_disclosed_funding),
        disclosedDealsCount: Number(row.disclosed_deals_count),
        topSector: row.top_sector || "",
        topSectorCount: Number(row.top_sector_count) || 0,
        largestDealCompany: row.largest_deal_company || "N/A",
        largestDealAmount: Number(row.largest_deal_amount) || 0,
        uniqueInvestors: Number(row.unique_investors),
        uniqueCities: Number(row.unique_cities),
        uniqueSectors: Number(row.unique_sectors),
      }
    }
  }
  return null
}, ["analytics:site-stats"])

export async function getSiteStats(): Promise<SiteStats> {
  const fromDb = await getSiteStatsCached()
  if (fromDb) {
    return { ...fromDb, lastUpdated: new Date().toISOString() }
  }

  // Fallback: aggregate the bundled static dataset in JS (Supabase unconfigured
  // or the RPC errored).
  const data = fundingData
  const disclosedDeals = data.filter((d) => d.amount > 0)
  const totalFunding = disclosedDeals.reduce((sum, d) => sum + d.amount, 0)

  const sectorCounts = new Map<string, number>()
  data.forEach((d) => d.sectors.forEach((s) => sectorCounts.set(s, (sectorCounts.get(s) || 0) + 1)))
  const topSectorEntry = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  const largestDeal = disclosedDeals.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    disclosedDeals[0] || { company: "N/A", amount: 0 }
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
    largestDealAmount: largestDeal.amount,
    uniqueInvestors: allInvestors.size,
    uniqueCities: new Set(data.map((d) => d.location)).size,
    uniqueSectors: sectorCounts.size,
    lastUpdated: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// getMonthlyFunding
// ---------------------------------------------------------------------------
export async function getMonthlyFunding(
  months = 24,
  sector?: string
): Promise<MonthlyFunding[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const sinceStr = since.toISOString().split("T")[0]

  if (isSupabaseConfigured && supabase) {
    const rows = await fetchDatedRows(sinceStr, sector)
    if (rows.length > 0) return aggregateMonthly(rows)
  }

  const filtered = fundingData
    .filter((d) => d.date >= sinceStr && (!sector || d.sectors.includes(sector)))
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
// Verified-deal count — denominator for sector/stage percentages.
// Matches the old `data.length` (total verified rows). HEAD count, no rows.
// ---------------------------------------------------------------------------
async function verifiedDealCount(): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const { count, error } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("record_status", "verified")
    if (!error && count != null) return count
  }
  return fundingData.length
}

// ---------------------------------------------------------------------------
// getSectorStats — v_analytics_sector_stats view + DB-side group-by
// ---------------------------------------------------------------------------
interface SectorRow {
  sector: string
  deal_count: number
  total_funding: number
  avg_deal_size: number
}

const getSectorStatsCached = cached(async (): Promise<SectorStat[] | null> => {
  if (isSupabaseConfigured && supabase) {
    const [{ data, error }, total] = await Promise.all([
      supabase
        .from("v_analytics_sector_stats")
        .select("sector,deal_count,total_funding,avg_deal_size")
        .order("deal_count", { ascending: false })
        .limit(20),
      verifiedDealCount(),
    ])
    if (!error && data) {
      return (data as SectorRow[]).map((r) => ({
        sector: r.sector,
        dealCount: Number(r.deal_count),
        totalFunding: Number(r.total_funding),
        avgDealSize: Number(r.avg_deal_size),
        percentage: total > 0 ? (Number(r.deal_count) / total) * 100 : 0,
      }))
    }
  }
  return null
}, ["analytics:sector-stats"])

export async function getSectorStats(): Promise<SectorStat[]> {
  const fromDb = await getSectorStatsCached()
  if (fromDb) return fromDb

  // Fallback: aggregate static dataset in JS.
  const data = fundingData
  const total = data.length
  const sectorMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    for (const sector of deal.sectors) {
      const existing = sectorMap.get(sector) || { count: 0, funding: 0 }
      sectorMap.set(sector, { count: existing.count + 1, funding: existing.funding + deal.amount })
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
// getCityFunding — v_analytics_city_stats view
// ---------------------------------------------------------------------------
interface CityRow {
  city: string
  deal_count: number
  total_funding: number
}

const getCityFundingCached = cached(async (limit: number): Promise<CityFunding[] | null> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("v_analytics_city_stats")
      .select("city,deal_count,total_funding")
      .order("deal_count", { ascending: false })
      .limit(limit)
    if (!error && data) {
      return (data as CityRow[]).map((r) => ({
        city: r.city,
        dealCount: Number(r.deal_count),
        totalFunding: Number(r.total_funding),
      }))
    }
  }
  return null
}, ["analytics:city-funding"])

export async function getCityFunding(limit = 15): Promise<CityFunding[]> {
  const fromDb = await getCityFundingCached(limit)
  if (fromDb) return fromDb

  const data = fundingData
  const cityMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    const existing = cityMap.get(deal.location) || { count: 0, funding: 0 }
    cityMap.set(deal.location, {
      count: existing.count + 1,
      funding: existing.funding + deal.amount,
    })
  }

  return [...cityMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([city, { count, funding }]) => ({ city, dealCount: count, totalFunding: funding }))
}

// ---------------------------------------------------------------------------
// getStageDistribution — v_analytics_stage_stats view
// ---------------------------------------------------------------------------
interface StageRow {
  stage: string
  deal_count: number
  total_funding: number
}

const getStageDistributionCached = cached(async (): Promise<StageStat[] | null> => {
  if (isSupabaseConfigured && supabase) {
    const [{ data, error }, total] = await Promise.all([
      supabase
        .from("v_analytics_stage_stats")
        .select("stage,deal_count,total_funding")
        .order("deal_count", { ascending: false }),
      verifiedDealCount(),
    ])
    if (!error && data) {
      return (data as StageRow[]).map((r) => ({
        stage: r.stage,
        count: Number(r.deal_count),
        percentage: total > 0 ? (Number(r.deal_count) / total) * 100 : 0,
        totalFunding: Number(r.total_funding),
      }))
    }
  }
  return null
}, ["analytics:stage-distribution"])

export async function getStageDistribution(): Promise<StageStat[]> {
  const fromDb = await getStageDistributionCached()
  if (fromDb) return fromDb

  const data = fundingData
  const total = data.length
  const stageMap = new Map<string, { count: number; funding: number }>()

  for (const deal of data) {
    const existing = stageMap.get(deal.stage) || { count: 0, funding: 0 }
    stageMap.set(deal.stage, {
      count: existing.count + 1,
      funding: existing.funding + deal.amount,
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
// getYoYComparison — v_analytics_yoy view
// ---------------------------------------------------------------------------
interface YoYRow {
  year: string
  deal_count: number
  total_funding: number
}

const getYoYComparisonCached = cached(
  async (): Promise<{ year: string; totalFunding: number; dealCount: number }[] | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("v_analytics_yoy")
        .select("year,deal_count,total_funding")
        .order("year", { ascending: true })
      if (!error && data) {
        return (data as YoYRow[]).map((r) => ({
          year: r.year,
          totalFunding: Number(r.total_funding),
          dealCount: Number(r.deal_count),
        }))
      }
    }
    return null
  },
  ["analytics:yoy"]
)

export async function getYoYComparison(): Promise<
  { year: string; totalFunding: number; dealCount: number }[]
> {
  const fromDb = await getYoYComparisonCached()
  if (fromDb) return fromDb

  const data = fundingData
  const yearMap = new Map<string, { funding: number; count: number }>()

  for (const deal of data) {
    const year = deal.date.substring(0, 4)
    const existing = yearMap.get(year) || { funding: 0, count: 0 }
    yearMap.set(year, {
      funding: existing.funding + deal.amount,
      count: existing.count + 1,
    })
  }

  return [...yearMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { funding, count }]) => ({ year, totalFunding: funding, dealCount: count }))
}

// ---------------------------------------------------------------------------
// getTopInvestorsByActivity — v_analytics_investor_activity view
// ---------------------------------------------------------------------------
interface InvestorRow {
  name: string
  deal_count: number
  total_deployed: number
}

const getTopInvestorsByActivityCached = cached(
  async (limit: number): Promise<{ name: string; dealCount: number; totalDeployed: number }[] | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("v_analytics_investor_activity")
        .select("name,deal_count,total_deployed")
        .order("deal_count", { ascending: false })
        .limit(limit)
      if (!error && data) {
        return (data as InvestorRow[]).map((r) => ({
          name: r.name,
          dealCount: Number(r.deal_count),
          totalDeployed: Number(r.total_deployed),
        }))
      }
    }
    return null
  },
  ["analytics:top-investors"]
)

export async function getTopInvestorsByActivity(
  limit = 10
): Promise<{ name: string; dealCount: number; totalDeployed: number }[]> {
  const fromDb = await getTopInvestorsByActivityCached(limit)
  if (fromDb) return fromDb

  const data = fundingData
  const map = new Map<string, { count: number; deployed: number }>()

  for (const deal of data) {
    for (const investor of deal.investors) {
      if (!investor || investor === "Not Disclosed" || investor === "Undisclosed") continue
      const existing = map.get(investor) || { count: 0, deployed: 0 }
      map.set(investor, {
        count: existing.count + 1,
        deployed: existing.deployed + deal.amount,
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
  year: number,
  sector?: string
): Promise<{ month: string; totalFunding: number; dealCount: number }[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  if (isSupabaseConfigured && supabase) {
    // A single year can exceed the 1000-row cap (2021 alone is ~2.3k), so page through.
    const rows: { date: string; amount: number }[] = []
    for (let from = 0; ; from += PAGE) {
      let query = supabase
        .from("deals")
        .select("deal_date,amount_inr")
        .eq("record_status", "verified")
        .gte("deal_date", startDate)
        .lte("deal_date", endDate)
      if (sector) query = query.contains("sectors", [sector])
      const { data, error } = await query
        .order("deal_date", { ascending: true })
        .range(from, from + PAGE - 1)

      if (error) break
      if (data && data.length)
        rows.push(
          ...data.map((r: { deal_date: string; amount_inr: number }) => ({
            date: r.deal_date,
            amount: r.amount_inr,
          }))
        )
      if (!data || data.length < PAGE) break
    }
    if (rows.length > 0) return aggregateMonthly(rows)
  }

  return aggregateMonthly(
    fundingData
      .filter(
        (d) =>
          d.date >= startDate && d.date <= endDate && (!sector || d.sectors.includes(sector))
      )
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
