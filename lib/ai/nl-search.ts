import { anthropic, isAIConfigured, MODELS, textFromResponse, parseJsonLoose } from "@/lib/ai/client"
import { logUsage } from "@/lib/ai/usage-logger"
import { assertWithinBudget } from "@/lib/ai/budget"
import { getDeals } from "@/lib/db/deals"
import type { Deal, DealFilters } from "@/lib/types"

export interface NLSearchResult {
  deals: Deal[]
  total: number
  filters: ParsedFilters
  explanation: string
}

interface ParsedFilters {
  sectors: string[]
  stages: string[]
  location: string | null
  investor: string | null
  years: string[]
  min_amount_lakhs: number | null
  max_amount_lakhs: number | null
}

const EMPTY_FILTERS: ParsedFilters = {
  sectors: [],
  stages: [],
  location: null,
  investor: null,
  years: [],
  min_amount_lakhs: null,
  max_amount_lakhs: null,
}

const SCHEMA = `{
  "sectors":            string[],   // e.g. ["Fintech"], ["Healthtech","SaaS"] — Title Case
  "stages":             string[],   // e.g. ["Seed"], ["Series A","Series B"]
  "location":           string|null,// single city, Title Case ("Bangalore", "Mumbai")
  "investor":           string|null,// single investor name to filter by
  "years":              string[],   // e.g. ["2024","2025"]
  "min_amount_lakhs":   number|null,// in lakhs INR (1 crore = 100 lakhs)
  "max_amount_lakhs":   number|null
}`

const PROMPT = (q: string) => `You convert natural-language Indian-startup-funding queries into a JSON filter object.

Respond with ONLY a JSON object (no markdown fence, no preamble) matching this schema:
${SCHEMA}

Rules:
- Only fill fields the user explicitly mentions. Use [] / null for everything else.
- Stage names: "Pre-Seed", "Seed", "Pre-Series A", "Series A", "Series B", "Series C", "Series C+", "Bridge", "Debt".
- Convert "$X million" to lakhs (1 USD ≈ 84 INR, so $1M ≈ 840 lakhs). Convert "X crore" to lakhs (1 crore = 100 lakhs).
- For "last year" / "this year" — leave years=[] and let the caller handle defaults.

Query: ${JSON.stringify(q)}`

/**
 * Natural-language search: Claude parses the query → filters → real DB query.
 * AI never generates results, only the filter shape. Every returned deal is a verified row.
 */
export async function naturalLanguageSearch(query: string): Promise<NLSearchResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { deals: [], total: 0, filters: EMPTY_FILTERS, explanation: "Empty query." }
  }

  let filters = EMPTY_FILTERS
  let explanation = `Searching for "${trimmed}" (no AI parsing — showing keyword match).`

  if (isAIConfigured && anthropic) {
    try {
      // Enforced spend ceiling — refuse the paid call if month-to-date is over budget.
      await assertWithinBudget()
      const message = await anthropic.messages.create({
        model: MODELS.parser,
        max_tokens: 300,
        messages: [{ role: "user", content: PROMPT(trimmed) }],
      })
      const parsed = parseJsonLoose<ParsedFilters>(textFromResponse(message))
      if (parsed) {
        filters = { ...EMPTY_FILTERS, ...parsed }
        explanation = buildExplanation(filters, trimmed)
      }
      await logUsage({
        useCase: "nl_search",
        model: MODELS.parser,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      })
    } catch (err) {
      console.error("[nl-search] parse failed, falling back to keyword search:", err)
    }
  }

  const dbFilters: DealFilters = {
    sectors: filters.sectors,
    stages: filters.stages,
    location: filters.location ?? "",
    investorSearch: filters.investor ?? "",
    years: filters.years,
    minAmount: filters.min_amount_lakhs ?? 0,
    maxAmount: filters.max_amount_lakhs ?? Infinity,
    // Fallback: if no structured filter came back, treat the query as a company keyword.
    search: hasAnyFilter(filters) ? "" : trimmed,
    limit: 50,
  }

  const result = await getDeals(dbFilters)
  return {
    deals: result.deals,
    total: result.total,
    filters,
    explanation,
  }
}

function hasAnyFilter(f: ParsedFilters): boolean {
  return (
    f.sectors.length > 0 ||
    f.stages.length > 0 ||
    !!f.location ||
    !!f.investor ||
    f.years.length > 0 ||
    f.min_amount_lakhs != null ||
    f.max_amount_lakhs != null
  )
}

function buildExplanation(f: ParsedFilters, q: string): string {
  const parts: string[] = []
  if (f.sectors.length) parts.push(`sectors: ${f.sectors.join(", ")}`)
  if (f.stages.length) parts.push(`stages: ${f.stages.join(", ")}`)
  if (f.location) parts.push(`location: ${f.location}`)
  if (f.investor) parts.push(`investor: ${f.investor}`)
  if (f.years.length) parts.push(`years: ${f.years.join(", ")}`)
  if (f.min_amount_lakhs != null) parts.push(`min ₹${f.min_amount_lakhs}L`)
  if (f.max_amount_lakhs != null) parts.push(`max ₹${f.max_amount_lakhs}L`)
  if (!parts.length) return `Interpreted "${q}" as a keyword search.`
  return `Interpreted as → ${parts.join(" · ")}`
}
