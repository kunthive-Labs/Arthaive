import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { Sector } from "@/lib/types"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function getAllSectorsWithStats(): Promise<Sector[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("sectors").select("*").order("name")
    if (!error && data) {
      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        dealCount: (row.deal_count as number) || 0,
        totalFunding: (row.total_funding as number) || 0,
        avgDealSize: (row.avg_deal_size as number) || 0,
        topStages: (row.top_stages as string[]) || [],
        topCities: (row.top_cities as string[]) || [],
      }))
    }
  }

  return buildSectorsFromStatic()
}

function buildSectorsFromStatic(): Sector[] {
  const sectorMap = new Map<string, { deals: typeof fundingData }>()

  for (const deal of fundingData) {
    for (const sector of deal.sectors) {
      if (!sectorMap.has(sector)) sectorMap.set(sector, { deals: [] })
      sectorMap.get(sector)!.deals.push(deal)
    }
  }

  return [...sectorMap.entries()]
    .map(([name, { deals }]) => {
      const disclosed = deals.filter((d) => d.amount > 0)
      const totalFunding = disclosed.reduce((sum, d) => sum + d.amount, 0)

      const stageCounts = new Map<string, number>()
      deals.forEach((d) => stageCounts.set(d.stage, (stageCounts.get(d.stage) || 0) + 1))
      const topStages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s)

      const cityCounts = new Map<string, number>()
      deals.forEach((d) => cityCounts.set(d.location, (cityCounts.get(d.location) || 0) + 1))
      const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)

      return {
        id: slugify(name),
        name,
        slug: slugify(name),
        dealCount: deals.length,
        totalFunding,
        avgDealSize: disclosed.length > 0 ? totalFunding / disclosed.length : 0,
        topStages,
        topCities,
      }
    })
    .sort((a, b) => b.dealCount - a.dealCount)
}

export async function getSectorBySlug(slug: string): Promise<Sector | null> {
  const sectors = await getAllSectorsWithStats()
  return sectors.find((s) => s.slug === slug) || null
}
