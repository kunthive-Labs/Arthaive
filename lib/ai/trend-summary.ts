import { anthropic, isAIConfigured, MODELS, textFromResponse } from "@/lib/ai/client"
import { logUsage } from "@/lib/ai/usage-logger"
import { assertWithinBudget } from "@/lib/ai/budget"
import { supabaseAdmin } from "@/lib/supabase"
import type { FundingReport } from "@/lib/db/reports"
import { formatCurrency } from "@/lib/format"

const CACHE_TTL_DAYS = 7

interface CachedSummary {
  summary: string
  generated_at: string
}

/**
 * Generate (or return cached) AI trend summary for a report period.
 * Returns null when AI is not configured or generation fails — callers should
 * show a "no summary available" state in that case rather than break.
 */
export async function generateTrendSummary(
  report: FundingReport,
): Promise<{ summary: string; cached: boolean } | null> {
  const periodId = report.period.id

  // 1. Cache lookup
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("report_summaries")
      .select("summary, generated_at")
      .eq("period_id", periodId)
      .maybeSingle()

    const cached = data as CachedSummary | null
    if (cached) {
      const ageDays = (Date.now() - new Date(cached.generated_at).getTime()) / 86400_000
      if (ageDays < CACHE_TTL_DAYS) {
        return { summary: cached.summary, cached: true }
      }
    }
  }

  if (!isAIConfigured || !anthropic) return null

  // Enforced spend ceiling — applies only to the cache MISS path (a fresh, paid
  // Sonnet generation). Cached summaries above returned before reaching here, so
  // serving cached content never trips the budget. Kept outside the try/catch so
  // an over-budget condition surfaces to the caller instead of being swallowed.
  await assertWithinBudget()

  // 2. Build prompt input — keep it compact, this is mostly read by Claude.
  const promptData = {
    period: report.period.label,
    total_capital_inr_lakhs: report.totalFunding,
    total_capital_formatted: formatCurrency(report.totalFunding),
    deal_count: report.totalDeals,
    disclosed_deals: report.disclosedDeals,
    unique_startups: report.newStartups,
    top_deals: report.topDeals.slice(0, 5).map((d) => ({
      company: d.company,
      amount: formatCurrency(d.amount),
      stage: d.stage,
      sector: d.sectors[0] ?? null,
      city: d.location,
    })),
    top_sectors: report.bySector.slice(0, 5).map((s) => ({
      sector: s.sector,
      deal_count: s.dealCount,
      total: formatCurrency(s.totalFunding),
    })),
    top_stages: report.byStage.slice(0, 5),
    top_investors: report.topInvestors.slice(0, 5),
  }

  const prompt = `You are summarising India startup funding data for a weekly digest.
Write 2-3 short paragraphs (max ~180 words total) covering: total capital deployed,
notable deals, sector trends, and any patterns worth calling out.

Be factual. Only state what the data shows. Do not speculate or extrapolate.
Do not invent investor names, sectors, or numbers. Do not use markdown headings.

Data:
${JSON.stringify(promptData, null, 2)}`

  try {
    const message = await anthropic.messages.create({
      model: MODELS.prose,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    const summary = textFromResponse(message).trim()
    if (!summary) return null

    // 3. Persist (overwrites stale entries because period_id is the primary key)
    if (supabaseAdmin) {
      await supabaseAdmin.from("report_summaries").upsert({
        period_id: periodId,
        period_type: report.period.type,
        summary,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        model: MODELS.prose,
        generated_at: new Date().toISOString(),
      })
    }

    await logUsage({
      useCase: "trend_summary",
      model: MODELS.prose,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    })

    return { summary, cached: false }
  } catch (err) {
    console.error("[trend summary] generation failed:", err)
    return null
  }
}
