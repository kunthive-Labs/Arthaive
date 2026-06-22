import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { Deal, DealFilters, PaginatedDeals } from "@/lib/types"
import { filterYearSchema } from "@/lib/validation"

function mapStaticDeal(d: (typeof fundingData)[0]): Deal {
  return {
    id: d.id,
    company: d.company,
    companyUrl: "",
    amount: d.amount,
    amountUsd: 0,
    stage: d.stage,
    sectors: d.sectors,
    investors: d.investors,
    leadInvestor: d.leadInvestor,
    date: d.date,
    location: d.location,
    description: d.description,
    sourceUrl: d.sourceUrl,
    weekFolder: d.weekFolder,
  }
}

function mapSupabaseDeal(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    company: row.company as string,
    companyUrl: (row.company_url as string) || "",
    amount: row.amount_inr as number,
    amountUsd: row.amount_usd as number,
    stage: row.stage as string,
    sectors: (row.sectors as string[]) || [],
    investors: (row.investors as string[]) || [],
    leadInvestor: (row.lead_investor as string) || "",
    date: row.deal_date as string,
    location: row.location as string,
    description: (row.description as string) || "",
    sourceUrl: (row.source_url as string) || "",
    weekFolder: (row.week_folder as string) || "",
  }
}

export async function getDeals(filters: DealFilters = {}): Promise<PaginatedDeals> {
  const {
    search = "",
    investorSearch = "",
    sectors = [],
    stages = [],
    location = "",
    minAmount = 0,
    maxAmount = Infinity,
    years = [],
    showUndisclosed = true,
    sortBy = "date",
    page: rawPage = 1,
    limit: rawLimit = 20,
  } = filters

  // Guard against NaN/invalid values flowing into (page-1)*limit range math.
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 20

  // `years` are raw strings from searchParams that get interpolated into a
  // PostgREST .or() filter string, so validate them: keep only sane 4-digit
  // years and drop anything else before they reach the filter builder.
  const validYears = years.filter((y) => filterYearSchema.safeParse(y).success)

  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("deals").select("*", { count: "exact" })

    if (search) query = query.ilike("company", `%${search}%`)
    if (investorSearch) query = query.contains("investors", [investorSearch])
    if (sectors.length) query = query.overlaps("sectors", sectors)
    if (stages.length) query = query.in("stage", stages)
    if (location) query = query.eq("location", location)
    if (!showUndisclosed) query = query.gt("amount_inr", 0)
    if (minAmount > 0) query = query.gte("amount_inr", minAmount)
    if (maxAmount < Infinity) query = query.lte("amount_inr", maxAmount)
    if (validYears.length) {
      // Each year is an AND of its bounds; the years themselves OR together.
      // Without the and(...) grouping, `.or()` reads the bare gte/lte as a flat
      // OR — "date >= Jan 1 OR date <= Dec 31" — which is true for every row, so
      // the year filter silently matched the entire table.
      const yearFilters = validYears.map(
        (y) => `and(deal_date.gte.${y}-01-01,deal_date.lte.${y}-12-31)`
      )
      query = query.or(yearFilters.join(","))
    }

    query = sortBy === "amount"
      ? query.order("amount_inr", { ascending: false })
      : query.order("deal_date", { ascending: false })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return {
      deals: (data || []).map(mapSupabaseDeal),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  let data = fundingData.map(mapStaticDeal)

  if (search) data = data.filter((d) => d.company.toLowerCase().includes(search.toLowerCase()))
  if (investorSearch)
    data = data.filter((d) => d.investors.some((i) => i.toLowerCase().includes(investorSearch.toLowerCase())))
  if (sectors.length) data = data.filter((d) => d.sectors.some((s) => sectors.includes(s)))
  if (stages.length) data = data.filter((d) => stages.includes(d.stage))
  if (location) data = data.filter((d) => d.location === location)
  if (!showUndisclosed) data = data.filter((d) => d.amount > 0)
  if (minAmount > 0) data = data.filter((d) => d.amount >= minAmount)
  if (maxAmount < Infinity) data = data.filter((d) => d.amount <= maxAmount)
  if (validYears.length) data = data.filter((d) => validYears.includes(new Date(d.date).getFullYear().toString()))

  data = data.sort((a, b) =>
    sortBy === "amount" ? b.amount - a.amount : new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const total = data.length
  const sliced = data.slice((page - 1) * limit, page * limit)

  return { deals: sliced, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getDealById(id: string): Promise<Deal | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("deals").select("*").eq("id", id).single()
    if (error || !data) return null
    return mapSupabaseDeal(data)
  }

  const found = fundingData.find((d) => d.id === id)
  return found ? mapStaticDeal(found) : null
}

// Page through a single projected column across all rows (Supabase caps a select
// at 1000 rows, so distinct-value dropdowns must exhaust every page or they go stale).
async function fetchColumnAll<T>(column: string): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase!
      .from("deals")
      .select(column)
      .range(from, from + PAGE - 1)
    if (error) break
    if (data && data.length) out.push(...(data as unknown as T[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

export async function getAllLocations(): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    const rows = await fetchColumnAll<{ location: string }>("location")
    const unique = [...new Set(rows.map((d) => d.location))]
    return unique.filter(Boolean).sort()
  }
  return [...new Set(fundingData.map((d) => d.location))].sort()
}

export async function getAllSectors(): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    const rows = await fetchColumnAll<{ sectors: string[] }>("sectors")
    const all = rows.flatMap((d) => d.sectors)
    return [...new Set(all)].sort()
  }
  return [...new Set(fundingData.flatMap((d) => d.sectors))].sort()
}

export async function getAllStages(): Promise<string[]> {
  const predefined = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series C+", "Pre-Series A", "Pre-Series B", "Bridge", "Debt", "IPO"]
  return predefined
}

// Years actually present in the dataset, newest first. The deal table spans
// 2015→present, so a hardcoded "last 5 years" list left a decade of deals
// impossible to filter by year. Derive the floor from the oldest row instead.
export async function getDealYears(): Promise<string[]> {
  const currentYear = new Date().getFullYear()

  let minYear = currentYear
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from("deals")
      .select("deal_date")
      .order("deal_date", { ascending: true })
      .limit(1)
    const oldest = data?.[0]?.deal_date as string | undefined
    if (oldest) minYear = new Date(oldest).getFullYear()
  } else {
    const years = fundingData
      .map((d) => new Date(d.date).getFullYear())
      .filter((y) => Number.isFinite(y))
    if (years.length) minYear = Math.min(...years)
  }

  // Guard against a bad/out-of-range oldest date producing a huge list.
  if (!Number.isFinite(minYear) || minYear < 2000 || minYear > currentYear) {
    minYear = currentYear - 10
  }

  const span = currentYear - minYear + 1
  return Array.from({ length: span }, (_, i) => String(currentYear - i))
}
