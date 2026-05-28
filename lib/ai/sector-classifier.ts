import { anthropic, isAIConfigured, MODELS, textFromResponse, parseJsonLoose } from "@/lib/ai/client"
import { logUsage } from "@/lib/ai/usage-logger"
import { supabaseAdmin } from "@/lib/supabase"

export interface SectorClassification {
  sector: string
  confidence: number
  cached: boolean
}

interface CacheRow {
  sector: string
  confidence: number
}

const KNOWN_SECTORS = [
  "Fintech", "Healthtech", "Edtech", "Ecommerce", "SaaS", "AI/ML",
  "Logistics", "Foodtech", "Mobility", "Climate", "Agritech", "Gaming",
  "Real Estate", "Manufacturing", "D2C", "Crypto", "Cybersecurity",
  "Media", "HR Tech", "Legal Tech", "Other",
]

const PROMPT = (company: string, description: string) => `Classify this Indian startup into one of these sectors:
${KNOWN_SECTORS.join(", ")}.

Respond with ONLY a JSON object (no preamble, no markdown):
{ "sector": <one of the above>, "confidence": <0..1> }

Be conservative — if uncertain, use "Other" with low confidence.

Company: ${company}
Description: ${description || "(none)"}`

/**
 * Last-resort sector classifier, used by the extraction pipeline when
 * rule-based extraction returns confidence < 0.6.
 *
 * Results are cached in `sector_cache` keyed by company name to avoid
 * repeated API calls for the same startup.
 */
export async function classifySector(
  company: string,
  description = "",
): Promise<SectorClassification | null> {
  const key = company.trim()
  if (!key) return null

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("sector_cache")
      .select("sector, confidence")
      .eq("company", key)
      .maybeSingle()
    const cached = data as CacheRow | null
    if (cached) {
      return { sector: cached.sector, confidence: Number(cached.confidence), cached: true }
    }
  }

  if (!isAIConfigured || !anthropic) return null

  try {
    const message = await anthropic.messages.create({
      model: MODELS.classifier,
      max_tokens: 80,
      messages: [{ role: "user", content: PROMPT(key, description) }],
    })

    const parsed = parseJsonLoose<{ sector: string; confidence: number }>(
      textFromResponse(message),
    )
    if (!parsed || !parsed.sector) return null

    const sector = KNOWN_SECTORS.includes(parsed.sector) ? parsed.sector : "Other"
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))

    if (supabaseAdmin) {
      await supabaseAdmin.from("sector_cache").upsert({
        company: key,
        sector,
        confidence,
        model: MODELS.classifier,
      })
    }

    await logUsage({
      useCase: "sector_classify",
      model: MODELS.classifier,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    })

    return { sector, confidence, cached: false }
  } catch (err) {
    console.error("[sector-classify] failed:", err)
    return null
  }
}
