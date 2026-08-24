/**
 * Synthetic replacement for `@/data/funding-data`.
 *
 * `data/funding-data.ts` is deliberately an EMPTY array: Supabase is the single
 * runtime source of truth and the generated file exists only to carry the
 * `FundingDeal` type and to keep `lib/db/*`'s fallback branch type-checking (see
 * scripts/generate-funding-data.js and the fail-loud guard in lib/supabase.ts).
 *
 * That means any test that reaches `lib/db/*` without Supabase configured reads
 * zero rows, and every "for (const row of body.data)" assertion passes
 * vacuously. Tests therefore `vi.mock("@/data/funding-data")` with the dataset
 * below, which is generated deterministically so expectations can be exact.
 *
 * Shape of the generated set (see `buildSyntheticFundingData`):
 *   - 250 deals — deliberately > the 100-row page cap in lib/ai/chat-tools.ts
 *     (AGGREGATE_PAGE_LIMIT) and > the 100-row cap in lib/db/deals.ts, so tests
 *     that exist to prove pagination is exhausted keep their meaning.
 *   - 5 complete past years x 50 deals, so no row is dated in the future and the
 *     set never straddles "today" as the clock moves.
 *   - Every 5th deal is undisclosed (amount 0), so "the top row by amount is
 *     disclosed" and "averages skip undisclosed" are not vacuous.
 *   - Amounts are exact multiples of 835 lakh (= $1M at the flat 83.5 rate), so
 *     USD expectations stay whole numbers.
 */

export interface SyntheticFundingDeal {
  id: string
  company: string
  amount: number
  stage: string
  sectors: string[]
  investors: string[]
  leadInvestor: string
  date: string
  location: string
  description: string
  sourceUrl: string
  weekFolder: string
}

/** ₹ lakh that equal exactly $1M at the dataset's flat 83.5 INR/USD rate. */
export const LAKHS_PER_USD_MILLION = 835

export const DEALS_PER_YEAR = 50

/**
 * Five *complete* past years. Relative to the clock rather than hardcoded so
 * the fixture cannot rot into "all deals are in the future" or drift outside
 * the 1990-2100 window the year filters validate against.
 */
export const FIXTURE_YEARS: number[] = (() => {
  const currentYear = new Date().getFullYear()
  return [5, 4, 3, 2, 1].map((back) => currentYear - back)
})()

export const FIXTURE_TOTAL = FIXTURE_YEARS.length * DEALS_PER_YEAR

export const FIXTURE_SECTORS = ["Fintech", "SaaS", "Edtech", "Healthtech", "Deeptech"] as const
export const FIXTURE_STAGES = ["Pre-Seed", "Series A", "Seed", "Series B"] as const
export const FIXTURE_CITIES = ["Bengaluru", "Mumbai", "Delhi", "Pune"] as const
export const FIXTURE_INVESTORS = [
  "Alpha Capital",
  "Beta Ventures",
  "Gamma Partners",
  "Delta Fund",
  "Epsilon Angels",
] as const

/** Two distinct name prefixes so substring search has an exact expected count. */
export const FIXTURE_COMPANY_PREFIXES = ["Nimbus", "Kestrel"] as const

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0")
}

/**
 * Deterministic — no randomness, no Date.now() beyond the year window above, so
 * every expectation in the suite can be derived rather than eyeballed.
 */
export function buildSyntheticFundingData(): SyntheticFundingDeal[] {
  const deals: SyntheticFundingDeal[] = []

  for (let n = 0; n < FIXTURE_TOTAL; n++) {
    const year = FIXTURE_YEARS[Math.floor(n / DEALS_PER_YEAR)]

    // Months 02-11 on the 15th. Mid-month and mid-year on purpose:
    // lib/db/deals.ts filters years via `new Date(d.date).getFullYear()`, which
    // is timezone-local, while lib/ai/chat-tools.ts groups via `date.slice(0,4)`,
    // which is not. A Jan-1 or Dec-31 date would make those two disagree in any
    // timezone west of UTC; the 15th of an inner month can never shift years.
    const month = pad((n % 10) + 2, 2)
    const date = `${year}-${month}-15`

    // Every 5th deal is undisclosed. The rest increase strictly with n, so the
    // single largest deal is unambiguous and `sortBy: "amount"` is deterministic.
    const amount = n % 5 === 4 ? 0 : LAKHS_PER_USD_MILLION * (n + 1)

    const primarySector = FIXTURE_SECTORS[n % FIXTURE_SECTORS.length]
    const secondarySector = FIXTURE_SECTORS[(n + 1) % FIXTURE_SECTORS.length]
    // Every third deal is multi-sector, so "a deal counts once in each of its
    // sectors" is exercised by the aggregate paths too.
    const sectors = n % 3 === 0 ? [primarySector, secondarySector] : [primarySector]

    const leadInvestor = FIXTURE_INVESTORS[n % FIXTURE_INVESTORS.length]
    const coInvestor = FIXTURE_INVESTORS[(n + 2) % FIXTURE_INVESTORS.length]

    deals.push({
      id: `deal-${pad(n, 3)}`,
      company: `${FIXTURE_COMPANY_PREFIXES[n % FIXTURE_COMPANY_PREFIXES.length]} ${pad(n, 3)}`,
      amount,
      stage: FIXTURE_STAGES[n % FIXTURE_STAGES.length],
      sectors,
      investors: [leadInvestor, coInvestor],
      leadInvestor,
      date,
      location: FIXTURE_CITIES[n % FIXTURE_CITIES.length],
      description: `Synthetic deal ${n} used by the test suite.`,
      sourceUrl: `https://example.test/deal/${pad(n, 3)}`,
      weekFolder: `W${(n % 4) + 1} ${year}`,
    })
  }

  return deals
}

export const syntheticFundingData: SyntheticFundingDeal[] = buildSyntheticFundingData()

/** Deals dated in `year`. */
export function fixtureDealsInYear(year: number): SyntheticFundingDeal[] {
  return syntheticFundingData.filter((d) => d.date.startsWith(`${year}-`))
}

/** Deals whose company name contains `q`, matching lib/db/deals.ts's filter. */
export function fixtureDealsMatchingCompany(q: string): SyntheticFundingDeal[] {
  const needle = q.toLowerCase()
  return syntheticFundingData.filter((d) => d.company.toLowerCase().includes(needle))
}

/** Deals at exactly `stage`, matching lib/db/deals.ts's exact-match filter. */
export function fixtureDealsAtStage(stage: string): SyntheticFundingDeal[] {
  return syntheticFundingData.filter((d) => d.stage === stage)
}

/** The single largest disclosed deal (unique by construction). */
export function fixtureTopDealByAmount(): SyntheticFundingDeal {
  return [...syntheticFundingData].sort((a, b) => b.amount - a.amount)[0]
}
