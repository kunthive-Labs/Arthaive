import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { Deal } from "@/lib/types"

const UNDISCLOSED_INVESTORS = new Set(["Not Disclosed", "Undisclosed", ""])

export interface ReportPeriod {
  id: string // "2026-W20" (ISO week) or "2026-05" (month)
  type: "week" | "month"
  label: string // "Week of 11 May 2026" or "May 2026"
  start: string // ISO date, inclusive
  end: string // ISO date, inclusive
}

export interface ReportPeriodSummary extends ReportPeriod {
  dealCount: number
  totalFunding: number
}

export interface FundingReport {
  period: ReportPeriod
  totalDeals: number
  totalFunding: number
  disclosedDeals: number
  newStartups: number
  topDeals: Deal[]
  bySector: { sector: string; dealCount: number; totalFunding: number }[]
  byStage: { stage: string; count: number; totalFunding: number }[]
  topInvestors: { name: string; dealCount: number }[]
  deals: Deal[]
}

// ---------------------------------------------------------------------------
// ISO week helpers (UTC-based to avoid timezone drift)
// ---------------------------------------------------------------------------
function isoWeekStart(year: number, week: number): Date {
  // Jan 4th is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = (jan4.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Dow)
  const start = new Date(week1Monday)
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return start
}

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // shift to the Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const ftDow = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDow + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return { year: d.getUTCFullYear(), week }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function parsePeriod(period: string): ReportPeriod | null {
  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(period)
  if (weekMatch) {
    const year = Number(weekMatch[1])
    const week = Number(weekMatch[2])
    if (week < 1 || week > 53) return null
    const start = isoWeekStart(year, week)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    const startDay = start.getUTCDate()
    const startMonth = MONTH_NAMES[start.getUTCMonth()].slice(0, 3)
    return {
      id: period,
      type: "week",
      label: `Week of ${startDay} ${startMonth} ${start.getUTCFullYear()}`,
      start: toISODate(start),
      end: toISODate(end),
    }
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const month = Number(monthMatch[2])
    if (month < 1 || month > 12) return null
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day
    return {
      id: period,
      type: "month",
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      start: toISODate(start),
      end: toISODate(end),
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Fetch verified deals within a date range (Supabase, static fallback)
// ---------------------------------------------------------------------------
function mapRow(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    company: row.company as string,
    companyUrl: (row.company_url as string) || "",
    amount: (row.amount_inr as number) ?? 0,
    amountUsd: (row.amount_usd as number) ?? 0,
    stage: (row.stage as string) || "",
    sectors: (row.sectors as string[]) || [],
    investors: (row.investors as string[]) || [],
    leadInvestor: (row.lead_investor as string) || "",
    date: row.deal_date as string,
    location: (row.location as string) || "",
    description: (row.description as string) || "",
    sourceUrl: (row.source_url as string) || "",
    weekFolder: (row.week_folder as string) || "",
  }
}

async function fetchDealsInRange(start: string, end: string): Promise<Deal[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("record_status", "verified")
      .gte("deal_date", start)
      .lte("deal_date", end)
      .order("amount_inr", { ascending: false })

    if (!error && data) {
      return (data as Record<string, unknown>[]).map(mapRow)
    }
  }

  return fundingData
    .filter((d) => d.date >= start && d.date <= end)
    .map((d) => ({
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
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ---------------------------------------------------------------------------
// getReport — full digest for a single period
// ---------------------------------------------------------------------------
export async function getReport(period: string): Promise<FundingReport | null> {
  const parsed = parsePeriod(period)
  if (!parsed) return null

  const deals = await fetchDealsInRange(parsed.start, parsed.end)

  const disclosed = deals.filter((d) => d.amount > 0)
  const totalFunding = disclosed.reduce((sum, d) => sum + d.amount, 0)

  const sectorMap = new Map<string, { count: number; funding: number }>()
  for (const deal of deals) {
    for (const sector of deal.sectors) {
      const e = sectorMap.get(sector) || { count: 0, funding: 0 }
      sectorMap.set(sector, { count: e.count + 1, funding: e.funding + deal.amount })
    }
  }

  const stageMap = new Map<string, { count: number; funding: number }>()
  for (const deal of deals) {
    const e = stageMap.get(deal.stage) || { count: 0, funding: 0 }
    stageMap.set(deal.stage, { count: e.count + 1, funding: e.funding + deal.amount })
  }

  const investorMap = new Map<string, number>()
  for (const deal of deals) {
    for (const inv of deal.investors) {
      if (UNDISCLOSED_INVESTORS.has(inv)) continue
      investorMap.set(inv, (investorMap.get(inv) || 0) + 1)
    }
  }

  return {
    period: parsed,
    totalDeals: deals.length,
    totalFunding,
    disclosedDeals: disclosed.length,
    newStartups: new Set(deals.map((d) => d.company)).size,
    topDeals: disclosed.slice(0, 5),
    bySector: [...sectorMap.entries()]
      .map(([sector, v]) => ({ sector, dealCount: v.count, totalFunding: v.funding }))
      .sort((a, b) => b.totalFunding - a.totalFunding),
    byStage: [...stageMap.entries()]
      .map(([stage, v]) => ({ stage, count: v.count, totalFunding: v.funding }))
      .sort((a, b) => b.count - a.count),
    topInvestors: [...investorMap.entries()]
      .map(([name, dealCount]) => ({ name, dealCount }))
      .sort((a, b) => b.dealCount - a.dealCount)
      .slice(0, 8),
    deals,
  }
}

// ---------------------------------------------------------------------------
// listAvailablePeriods — recent weeks & months that actually contain deals
// ---------------------------------------------------------------------------
async function fetchAllDealDates(): Promise<{ date: string; amount: number }[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("deals")
      .select("deal_date,amount_inr")
      .eq("record_status", "verified")

    if (!error && data) {
      return (data as { deal_date: string; amount_inr: number }[]).map((r) => ({
        date: r.deal_date,
        amount: r.amount_inr ?? 0,
      }))
    }
  }
  return fundingData.map((d) => ({ date: d.date, amount: d.amount }))
}

export async function listAvailablePeriods(): Promise<{
  weeks: ReportPeriodSummary[]
  months: ReportPeriodSummary[]
}> {
  const dates = await fetchAllDealDates()

  const weekBuckets = new Map<string, { count: number; funding: number }>()
  const monthBuckets = new Map<string, { count: number; funding: number }>()

  for (const { date, amount } of dates) {
    if (!date) continue
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) continue

    const { year, week } = getISOWeek(d)
    const weekId = `${year}-W${String(week).padStart(2, "0")}`
    const w = weekBuckets.get(weekId) || { count: 0, funding: 0 }
    weekBuckets.set(weekId, { count: w.count + 1, funding: w.funding + amount })

    const monthId = date.slice(0, 7)
    const m = monthBuckets.get(monthId) || { count: 0, funding: 0 }
    monthBuckets.set(monthId, { count: m.count + 1, funding: m.funding + amount })
  }

  const toSummary = (id: string, agg: { count: number; funding: number }): ReportPeriodSummary | null => {
    const p = parsePeriod(id)
    if (!p) return null
    return { ...p, dealCount: agg.count, totalFunding: agg.funding }
  }

  const weeks = [...weekBuckets.entries()]
    .map(([id, agg]) => toSummary(id, agg))
    .filter((x): x is ReportPeriodSummary => x !== null)
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 16)

  const months = [...monthBuckets.entries()]
    .map(([id, agg]) => toSummary(id, agg))
    .filter((x): x is ReportPeriodSummary => x !== null)
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 18)

  return { weeks, months }
}
