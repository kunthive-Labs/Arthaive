import type React from "react"
import { Sparkles } from "lucide-react"

/**
 * Banner that wraps any AI-generated content. Required on every AI-rendered surface
 * (trend summaries, NL search explanations, etc.) so users can always tell what's
 * sourced vs. what's model-generated.
 */
export function AILabel({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "subtle"
}) {
  const palette =
    tone === "subtle"
      ? "border-gray-200 bg-gray-50 text-gray-600"
      : "border-purple-300 bg-purple-50 text-purple-900"
  return (
    <div className={`border-2 ${palette} px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide`}>
      <Sparkles className="w-3.5 h-3.5" />
      <span>{children}</span>
    </div>
  )
}

/**
 * Block-level container — use around the full AI body (e.g. the trend summary paragraphs)
 * so the disclosure label sits attached above the generated content.
 */
export function AISection({
  label = "AI-generated summary — based on verified records. May contain errors.",
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-2 border-purple-300 bg-purple-50/40">
      <div className="px-4 pt-3">
        <AILabel>{label}</AILabel>
      </div>
      <div className="px-4 pb-4 pt-2 text-sm text-gray-800 leading-relaxed">
        {children}
      </div>
    </section>
  )
}
