/**
 * Unit tests for the chat data tools.
 *
 * `aggregateDeals` is exercised against a small inline fixture (amounts are in
 * ₹ lakh; 835 lakh = exactly $1M at the dataset's flat 83.5 rate, so expected
 * USD values stay clean). `executeTool` runs against the static `fundingData`
 * fallback since Supabase env vars are not set in CI.
 */
import { describe, it, expect } from "vitest"

import {
  aggregateDeals,
  executeTool,
  lakhsToUsdMillions,
  widgetDefaultSize,
  suggestWidgetSchema,
  CHAT_WIDGETS,
  type AggregatableDeal,
} from "@/lib/ai/chat-tools"

const FIXTURE: AggregatableDeal[] = [
  {
    amount: 835, // $1M
    stage: "Seed",
    sectors: ["Fintech", "SaaS"],
    investors: ["Alpha Capital", "Beta Ventures"],
    location: "Bengaluru",
    date: "2021-05-01",
  },
  {
    amount: 1670, // $2M
    stage: "Series A",
    sectors: ["Fintech"],
    investors: ["Alpha Capital"],
    location: "Mumbai",
    date: "2021-08-15",
  },
  {
    amount: 0, // undisclosed
    stage: "Seed",
    sectors: ["SaaS", "SaaS"], // duplicate on purpose — must count once
    investors: ["Gamma Partners"],
    location: "Bengaluru",
    date: "2022-01-10",
  },
  {
    amount: 3340, // $4M
    stage: "Seed",
    sectors: ["Edtech"],
    investors: ["Beta Ventures", "Gamma Partners"],
    location: "Delhi",
    date: "2022-03-20",
  },
]

describe("lakhsToUsdMillions", () => {
  it("converts ₹ lakh to millions of USD at the flat data rate", () => {
    expect(lakhsToUsdMillions(835)).toBe(1)
    expect(lakhsToUsdMillions(1670)).toBe(2)
  })

  it("treats zero/negative/invalid amounts as undisclosed", () => {
    expect(lakhsToUsdMillions(0)).toBeNull()
    expect(lakhsToUsdMillions(-5)).toBeNull()
    expect(lakhsToUsdMillions(NaN)).toBeNull()
  })
})

describe("aggregateDeals", () => {
  it("counts a multi-sector deal once in each of its sectors", () => {
    const groups = aggregateDeals(FIXTURE, "sector", "count", 25)
    const byName = Object.fromEntries(groups.map((g) => [g.group, g.count]))
    expect(byName).toEqual({ Fintech: 2, SaaS: 2, Edtech: 1 })
  })

  it("never counts a duplicated group key twice for the same deal", () => {
    // Deal 3 lists "SaaS" twice; SaaS must still be deal 1 + deal 3 = 2.
    const saas = aggregateDeals(FIXTURE, "sector", "count", 25).find((g) => g.group === "SaaS")
    expect(saas?.count).toBe(2)
  })

  it("sums total_usd per group and sorts descending", () => {
    const groups = aggregateDeals(FIXTURE, "sector", "total_usd", 25)
    expect(groups.map((g) => [g.group, g.totalUsdM])).toEqual([
      ["Edtech", 4],
      ["Fintech", 3],
      ["SaaS", 1],
    ])
  })

  it("averages over disclosed deals only", () => {
    const groups = aggregateDeals(FIXTURE, "sector", "avg_usd", 25)
    const saas = groups.find((g) => g.group === "SaaS")
    // SaaS has one disclosed ($1M) and one undisclosed deal → avg $1M, not $0.5M.
    expect(saas?.avgUsdM).toBe(1)
    expect(saas?.count).toBe(2)
    const fintech = groups.find((g) => g.group === "Fintech")
    expect(fintech?.avgUsdM).toBe(1.5)
  })

  it("reports null avg for groups with only undisclosed deals", () => {
    const deals: AggregatableDeal[] = [
      { amount: 0, stage: "Seed", sectors: ["Stealth"], investors: [], location: "Pune", date: "2023-02-01" },
    ]
    const groups = aggregateDeals(deals, "sector", "count", 25)
    expect(groups).toEqual([{ group: "Stealth", count: 1, totalUsdM: 0, avgUsdM: null }])
  })

  it("groups by investor, counting a deal once per participating investor", () => {
    const groups = aggregateDeals(FIXTURE, "investor", "count", 25)
    const byName = Object.fromEntries(groups.map((g) => [g.group, g.count]))
    expect(byName).toEqual({
      "Alpha Capital": 2,
      "Beta Ventures": 2,
      "Gamma Partners": 2,
    })
  })

  it("groups by year and stage", () => {
    const years = aggregateDeals(FIXTURE, "year", "count", 25)
    expect(Object.fromEntries(years.map((g) => [g.group, g.count]))).toEqual({
      "2021": 2,
      "2022": 2,
    })

    const stages = aggregateDeals(FIXTURE, "stage", "count", 25)
    expect(Object.fromEntries(stages.map((g) => [g.group, g.count]))).toEqual({
      Seed: 3,
      "Series A": 1,
    })
  })

  it("applies topN after sorting", () => {
    const groups = aggregateDeals(FIXTURE, "sector", "total_usd", 1)
    expect(groups).toHaveLength(1)
    expect(groups[0].group).toBe("Edtech")
  })
})

describe("executeTool", () => {
  it("query_deals returns compact rows and a total", async () => {
    const result = await executeTool("query_deals", { limit: 3, sortBy: "amount" })
    const parsed = JSON.parse(result.content) as {
      totalMatches: number
      returned: number
      deals: Array<Record<string, unknown>>
    }
    expect(parsed.returned).toBeLessThanOrEqual(3)
    expect(parsed.deals.length).toBe(parsed.returned)
    expect(parsed.totalMatches).toBeGreaterThan(0)
    for (const row of parsed.deals) {
      expect(row).toHaveProperty("company")
      expect(row).toHaveProperty("amountUSD")
      expect(row).toHaveProperty("stage")
      expect(row).toHaveProperty("sectors")
      expect(row).toHaveProperty("date")
      expect(row).toHaveProperty("leadInvestor")
      expect(row).toHaveProperty("location")
    }
    // Sorted by amount: first row must be disclosed.
    expect(parsed.deals[0].amountUSD).toBeGreaterThan(0)
  })

  it("query_deals applies year filters", async () => {
    const result = await executeTool("query_deals", { yearFrom: 2021, yearTo: 2021, limit: 5 })
    const parsed = JSON.parse(result.content) as { deals: Array<{ date: string }> }
    for (const row of parsed.deals) {
      expect(row.date.slice(0, 4)).toBe("2021")
    }
  })

  it("aggregate_deals aggregates the full matching set (beyond one page)", async () => {
    // topN 25 comfortably covers every year in the 2015-2026 dataset.
    const result = await executeTool("aggregate_deals", { groupBy: "year", metric: "count", topN: 25 })
    const parsed = JSON.parse(result.content) as {
      dealsMatched: number
      groups: Array<{ group: string; count: number }>
    }
    // The static dataset has ~13.7k deals; the per-page cap is 100, so this
    // only passes when pagination is exhausted.
    const counted = parsed.groups.reduce((sum, g) => sum + g.count, 0)
    expect(parsed.dealsMatched).toBeGreaterThan(1000)
    expect(counted).toBe(parsed.dealsMatched)
  })

  it("returns a readable validation error instead of throwing on bad args", async () => {
    const result = await executeTool("aggregate_deals", { groupBy: "colour" })
    const parsed = JSON.parse(result.content) as { error: string }
    expect(parsed.error).toContain("Invalid arguments for aggregate_deals")
    expect(result.summary).toContain("invalid arguments")
  })

  it("throws on unknown tool names", async () => {
    await expect(executeTool("suggest_widget", {})).rejects.toThrow("Unknown chat tool")
  })
})

describe("suggest_widget schema + sizes", () => {
  it("accepts a valid suggestion and rejects unknown widget types", () => {
    expect(
      suggestWidgetSchema.safeParse({
        type: "sector_bar",
        title: "Top Fintech Sectors",
        config: { sectors: ["Fintech"], yearFrom: 2022, topN: 10 },
      }).success,
    ).toBe(true)
    expect(
      suggestWidgetSchema.safeParse({ type: "pie_of_doom", title: "Nope" }).success,
    ).toBe(false)
  })

  it("returns a per-type default size with a fallback", () => {
    expect(widgetDefaultSize("kpi_capital")).toEqual({ w: 3, h: 3 })
    expect(widgetDefaultSize("geography_map")).toEqual({ w: 7, h: 11 })
    expect(widgetDefaultSize("does_not_exist")).toEqual({ w: 6, h: 8 })
  })

  it("catalogue ids are unique", () => {
    const ids = CHAT_WIDGETS.map((w) => w.type)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
