import { supabase, isSupabaseConfigured, requireSupabaseConfigured } from "@/lib/supabase"
import { fundingData } from "@/data/funding-data"
import type { Investor, Deal } from "@/lib/types"

// Supabase caps a single select at 1000 rows; a prolific investor can exceed
// that, so the deals query must page through .range() or it silently truncates.
// Mirrors the PAGE loop in lib/db/analytics.ts.
const PAGE = 1000

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

// ---------------------------------------------------------------------------
// Where investor aggregates actually live
// ---------------------------------------------------------------------------
// The `investors` TABLE carries identity only: id, name, slug, type, website,
// created_at. It has never had `deal_count` / `total_deployed` / `sectors` /
// `stages` / `cities` columns.
//
// The aggregates come from the `v_analytics_investor_activity` VIEW, which
// unnests deals.investors and counts verified deals per investor. That view is
// the same source lib/db/analytics.ts already reads, and it is the one granted
// SELECT to anon/authenticated/service_role. (`mv_investor_summary` also has
// these columns but carries no grants, so it is unreachable via the Data API.)
//
// Ordering by `investors.deal_count` therefore failed with Postgres 42703,
// `column investors.deal_count does not exist`. That error used to be swallowed
// by a silent fallback to the static dataset, so once the static dataset became
// an empty placeholder the /investors page rendered an empty list as though the
// database had legitimately reported no investors.

interface InvestorActivityRow {
  name: string
  deal_count: number
  total_deployed: number
}

interface InvestorIdentityRow {
  id: string
  name: string
  slug: string
  type: string | null
  website: string | null
}

/**
 * PostgREST parses `,` `.` `(` `)` `*` structurally inside a filter value, and
 * `%` / `_` are LIKE wildcards. Neutralise both so a search term cannot alter
 * the shape of the query it is embedded in.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`).replace(/[,.()*]/g, " ")
}

/** Look up identity columns for a batch of investor names. */
async function fetchInvestorIdentities(
  names: string[]
): Promise<Map<string, InvestorIdentityRow>> {
  if (!supabase || !names.length) return new Map()

  const { data, error } = await supabase
    .from("investors")
    .select("id,name,slug,type,website")
    .in("name", names)

  if (error) throw error

  return new Map(
    (data ?? []).map((row) => [row.name as string, row as InvestorIdentityRow])
  )
}

/**
 * The activity view holds more distinct investor names (11k) than the
 * `investors` table has rows (8.4k), because the view derives names from the
 * deals themselves. An identity row is therefore optional, and a missing one
 * must not drop the investor from the list.
 */
function mergeInvestor(
  activity: InvestorActivityRow,
  identity?: InvestorIdentityRow
): Investor {
  return {
    id: identity?.id ?? slugify(activity.name),
    name: activity.name,
    slug: identity?.slug ?? slugify(activity.name),
    type: (identity?.type as Investor["type"]) || "Other",
    website: identity?.website ?? undefined,
    dealCount: Number(activity.deal_count) || 0,
    totalDeployed: Number(activity.total_deployed) || 0,
    // Not exposed by the activity view. The profile page derives these from the
    // investor's actual deals; the list page does not render them.
    sectors: [],
    stages: [],
    cities: [],
  }
}

/** Shared read path for "investors ranked by activity", optionally name-filtered. */
async function queryInvestorsByActivity(
  limit: number,
  nameQuery?: string
): Promise<Investor[]> {
  if (!supabase) return []

  let request = supabase
    .from("v_analytics_investor_activity")
    .select("name,deal_count,total_deployed")

  if (nameQuery) {
    request = request.ilike("name", `%${escapeLikePattern(nameQuery)}%`)
  }

  const { data, error } = await request
    .order("deal_count", { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (data ?? []) as InvestorActivityRow[]
  const identities = await fetchInvestorIdentities(rows.map((r) => r.name))
  return rows.map((row) => mergeInvestor(row, identities.get(row.name)))
}

/**
 * Resolve a slug that has no row in the `investors` table.
 *
 * The activity view holds ~11k distinct investor names against the table's
 * ~8.4k rows, so roughly 2.6k investors — including some of the most active —
 * are linked by `slugify(name)` with no identity row behind them. A plain
 * `investors.slug` lookup 404s every one of those profiles.
 *
 * There is no slug column to match on in the view, so narrow in SQL with the
 * slug's words as a wildcard pattern ("tiger-global" -> "%tiger%global%") and
 * let the exact `slugify` round-trip below make the actual decision.
 */
async function resolveInvestorFromActivity(
  slug: string
): Promise<InvestorActivityRow | null> {
  if (!supabase) return null

  const words = slug.split("-").filter(Boolean).map(escapeLikePattern)
  if (!words.length) return null

  const { data, error } = await supabase
    .from("v_analytics_investor_activity")
    .select("name,deal_count,total_deployed")
    .ilike("name", `%${words.join("%")}%`)
    .limit(200)

  if (error) throw error

  const rows = (data ?? []) as InvestorActivityRow[]
  return rows.find((row) => slugify(row.name) === slug) ?? null
}

export async function getTopInvestors(limit = 50): Promise<Investor[]> {
  if (isSupabaseConfigured && supabase) {
    // Configured but failing: silently returning the (empty) static list would
    // render "no investors" as if the database said so.
    return queryInvestorsByActivity(limit)
  }

  requireSupabaseConfigured("getTopInvestors")
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
    const { data: identity, error } = await supabase
      .from("investors")
      .select("id,name,slug,type,website")
      .eq("slug", slug)
      .maybeSingle()

    // maybeSingle() reports "no match" as data: null, so a non-null error here
    // is a genuine failure and must not be flattened into a 404. (`single()`
    // conflated the two, which hid real errors behind a not-found page.)
    if (error) throw error

    const name =
      (identity?.name as string | undefined) ??
      (await resolveInvestorFromActivity(slug))?.name
    if (!name) return null

    const deals: Deal[] = []
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: pageError } = await supabase
        .from("deals")
        .select("*")
        .contains("investors", [name])
        .range(from, from + PAGE - 1)

      if (pageError) throw pageError
      if (page && page.length) deals.push(...(page as unknown as Deal[]))
      if (!page || page.length < PAGE) break
    }

    // `investors` has no aggregate columns (see the note above), so reading
    // data.deal_count / data.total_deployed here silently produced 0 and empty
    // arrays on a profile that was simultaneously rendering a full deal list.
    // Derive them from the deals actually fetched above, so the summary can
    // never disagree with the list beneath it.
    //
    // NOTE: `deals` holds raw PostgREST rows cast to Deal, so the money column
    // is still snake_case `amount_inr` here rather than `amount`.
    const rawDeals = deals as unknown as Record<string, unknown>[]
    const totalDeployed = rawDeals.reduce(
      (sum, d) => sum + (Number(d.amount_inr ?? d.amount) || 0),
      0
    )
    const uniq = (values: unknown[]) =>
      [...new Set(values.filter((v): v is string => typeof v === "string" && v !== ""))]

    return {
      id: (identity?.id as string | undefined) ?? slugify(name),
      name,
      slug: (identity?.slug as string | undefined) ?? slug,
      type: (identity?.type as Investor["type"]) || "Other",
      website: (identity?.website as string | undefined) ?? undefined,
      dealCount: deals.length,
      totalDeployed,
      sectors: uniq(rawDeals.flatMap((d) => (d.sectors as unknown[]) ?? [])),
      stages: uniq(rawDeals.map((d) => d.stage)),
      cities: uniq(rawDeals.map((d) => d.location)),
      deals: deals || [],
    }
  }

  requireSupabaseConfigured("getInvestorBySlug")

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
  // This used to search the static dataset unconditionally, which meant
  // GET /api/investors?search=... could only ever return [] once that dataset
  // became an empty placeholder — a search that always says "no results" rather
  // than admitting it has no data source. Query Supabase when it is configured.
  if (isSupabaseConfigured && supabase) {
    return queryInvestorsByActivity(limit, query)
  }

  requireSupabaseConfigured("searchInvestors")

  const all = getTopInvestorsFromStatic(1000)
  return all
    .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit)
}
