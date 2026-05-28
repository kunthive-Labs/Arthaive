import Anthropic from "@anthropic-ai/sdk"

/**
 * Single shared Anthropic client. Returns null when ANTHROPIC_API_KEY is unset
 * so AI features degrade gracefully instead of throwing at module load time.
 */
const apiKey = process.env.ANTHROPIC_API_KEY

export const isAIConfigured = Boolean(apiKey)

export const anthropic = apiKey
  ? new Anthropic({ apiKey })
  : null

// Model picks — keep cheap models for parsing/classification, the more capable
// Sonnet for prose. Update IDs here when migrating to newer model families.
export const MODELS = {
  prose: "claude-sonnet-4-6",                  // trend summaries
  parser: "claude-haiku-4-5-20251001",         // NL → filter JSON
  classifier: "claude-haiku-4-5-20251001",     // sector classification fallback
} as const

/**
 * Extract concatenated text from a Messages API response.
 * Anthropic responses are an array of typed content blocks; we only want text.
 */
export function textFromResponse(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
}

/**
 * Best-effort JSON extraction — strips ```json fences and trims to the outermost braces.
 * Returns null when nothing parseable is found.
 */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  let cleaned = text.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
  }
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T
      } catch {
        return null
      }
    }
    return null
  }
}
