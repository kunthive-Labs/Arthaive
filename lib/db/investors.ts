import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { Investor } from "@/lib/types"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildInvestorFromStatic(name: string): Investor {
  const deals = fundingData.filter((d) => d.investors.includes(name))
  const totalDeployed = deals.reduce((sum, d) => sum + d.amount, 0)
  const sectors = [...new Set(deals.flatMap((d) => d.sectors))]
  const stages = [...new Set(deals.map((d) => d.stage))]
  const cities = [...new Set(deals.map((d) => d.location))]

  return {
    id: slugify(name),
    name,
    slug: slugify(name),
    type: "VC",
    dealCount: deals.length,
    totalDeployed,
    sectors,
    stages,
    cities,
  }
}

export async function getTopInvestors(limit = 50): Promise<Investor[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("investors")
      .select("*")
      .order("deal_count", { ascending: false })
      .limit(limit)

    if (error || !data) return getTopInvestorsFromStatic(limit)

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      type: (row.type as Investor["type"]) || "Other",
      website: row.website as string | undefined,
      dealCount: (row.deal_count as number) || 0,
      totalDeployed: (row.total_deployed as number) || 0,
      sectors: (row.sectors as string[]) || [],
      stages: (row.stages as string[]) || [],
      cities: (row.cities as string[]) || [],
    }))
  }

  return getTopInvestorsFromStatic(limit)
}

function getTopInvestorsFromStatic(limit: number): Investor[] {
  const investorNames = fundingData
    .flatMap((d) => d.investors)
    .filter((name) => name && name !== "Not Disclosed" && name !== "Undisclosed")

  const counts = new Map<string, number>()
  for (const name of investorNames) {
    counts.set(name, (counts.get(name) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => buildInvestorFromStatic(name))
}

export async function getInvestorBySlug(slug: string): Promise<Investor | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("investors").select("*").eq("slug", slug).single()
    if (error || !data) return null

    const { data: deals } = await supabase.from("deals").select("*").contains("investors", [data.name])

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      type: data.type || "Other",
      website: data.website,
      dealCount: data.deal_count || 0,
      totalDeployed: data.total_deployed || 0,
      sectors: data.sectors || [],
      stages: data.stages || [],
      cities: data.cities || [],
      deals: deals || [],
    }
  }

  const allInvestors = getTopInvestorsFromStatic(1000)
  const investor = allInvestors.find((i) => i.slug === slug)
  if (!investor) return null

  const deals = fundingData
    .filter((d) => d.investors.includes(investor.name))
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { ...investor, deals }
}

export async function searchInvestors(query: string, limit = 10): Promise<Investor[]> {
  const all = getTopInvestorsFromStatic(1000)
  return all
    .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit)
}
