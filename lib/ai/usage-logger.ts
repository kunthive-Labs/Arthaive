import { supabaseAdmin } from "@/lib/supabase"

export type UseCase = "trend_summary" | "nl_search" | "sector_classify"

interface UsageEntry {
  useCase: UseCase
  model: string
  inputTokens: number
  outputTokens: number
  cached?: boolean
}

/**
 * Fire-and-forget log of a Claude call to `ai_usage_log`.
 * Failures are swallowed — observability shouldn't break user-facing features.
 */
export async function logUsage(entry: UsageEntry): Promise<void> {
  if (!supabaseAdmin) return
  try {
    await supabaseAdmin.from("ai_usage_log").insert({
      use_case: entry.useCase,
      model: entry.model,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      cached: entry.cached ?? false,
    })
  } catch (err) {
    console.error("[ai usage log] insert failed:", err)
  }
}

export interface UsageSummary {
  useCase: string
  totalCalls: number
  cachedCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

// Anthropic public pricing (USD per million tokens). Update when prices change.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
}

function costFor(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 1, output: 5 }
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
}

/** Roll up usage_log for the last N days, grouped by use_case. */
export async function getMonthlyUsage(
  days = 30,
): Promise<{ totalCostUsd: number; rows: UsageSummary[] }> {
  if (!supabaseAdmin) return { totalCostUsd: 0, rows: [] }

  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from("ai_usage_log")
    .select("use_case, model, input_tokens, output_tokens, cached")
    .gte("created_at", since)

  if (error || !data) return { totalCostUsd: 0, rows: [] }

  const byCase = new Map<string, UsageSummary>()
  let totalCost = 0

  for (const row of data as Array<{
    use_case: string
    model: string | null
    input_tokens: number | null
    output_tokens: number | null
    cached: boolean | null
  }>) {
    const key = row.use_case
    const cost = costFor(row.model ?? "", row.input_tokens ?? 0, row.output_tokens ?? 0)
    totalCost += cost
    const existing = byCase.get(key) ?? {
      useCase: key,
      totalCalls: 0,
      cachedCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    }
    existing.totalCalls += 1
    if (row.cached) existing.cachedCalls += 1
    existing.inputTokens += row.input_tokens ?? 0
    existing.outputTokens += row.output_tokens ?? 0
    existing.estimatedCostUsd += cost
    byCase.set(key, existing)
  }

  return {
    totalCostUsd: totalCost,
    rows: [...byCase.values()].sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd),
  }
}
