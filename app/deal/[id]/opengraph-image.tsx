import type { ReactElement } from "react"
import { ImageResponse } from "next/og"
import { formatInrLakhs } from "@/lib/format"

// Per-deal social card. When someone shares a deal link, this renders the
// company, amount, stage and sector on the brand's neo-brutalist template
// instead of the generic site card — so every share advertises a real deal.
//
// Edge runtime (like the root OG card) — ImageResponse's renderer runs there.
// The deal is fetched from the public /api/deals/[id] rather than importing the
// 7.9MB dataset (which would bloat/oom the edge function). Any failure falls back
// to a branded card, so a shared link never yields a broken image.
//
// NOTE: satori (next/og) requires every <div> with >1 child to set an explicit
// `display: flex`, so every container below sets it.
export const runtime = "edge"
export const alt = "Arthaive — Indian startup funding record"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CREAM = "#EFEDE3"
const GREEN = "#15803d"
const LOGO_GREEN = "#1A5D1A"
const ORANGE = "#FF5A1F"
const BLACK = "#0a0a0a"

interface DealLite {
  company?: string
  amount?: number
  stage?: string
  sectors?: string[]
  location?: string
  date?: string
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://arthaive.kunthive.in")
  )
}

async function fetchDeal(id: string): Promise<DealLite | null> {
  try {
    const res = await fetch(`${baseUrl()}/api/deals/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
    })
    if (!res.ok) return null
    const d = (await res.json()) as DealLite
    return d && d.company ? d : null
  } catch {
    return null
  }
}

function render(node: ReactElement) {
  return new ImageResponse(node, { ...size })
}

const wordmark = (
  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ display: "flex", border: `4px solid ${BLACK}`, padding: 8, background: "#fff" }}>
      <div style={{ display: "flex", width: 28, height: 28, background: LOGO_GREEN }} />
    </div>
    <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 1, color: BLACK }}>
      ARTHAIVE
    </div>
    <div
      style={{
        display: "flex",
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: "#6b7280",
        marginLeft: 8,
      }}
    >
      The Indian Startup Funding Ledger
    </div>
  </div>
)

function brandedFallback() {
  return render(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: CREAM,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: BLACK }}>Arthaive</div>
      <div style={{ display: "flex", fontSize: 28, color: "#6b7280", marginTop: 12 }}>
        The Indian Startup Funding Ledger
      </div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await fetchDeal(decodeURIComponent(id))
  if (!deal || !deal.company) return brandedFallback()

  const amount = deal.amount && deal.amount > 0 ? formatInrLakhs(deal.amount) : "Undisclosed"
  const topSectors = (deal.sectors ?? []).slice(0, 3)
  const year = deal.date ? String(new Date(deal.date).getFullYear()) : ""

  return render(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CREAM,
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      {wordmark}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              background: GREEN,
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              padding: "8px 18px",
            }}
          >
            {deal.stage || "Funding round"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: deal.company.length > 22 ? 76 : 96,
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: -2,
            color: BLACK,
            maxWidth: 1040,
          }}
        >
          {deal.company}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {topSectors.map((s) => (
            <div
              key={s}
              style={{
                display: "flex",
                border: `3px solid ${LOGO_GREEN}`,
                color: LOGO_GREEN,
                fontSize: 20,
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "6px 14px",
                background: "#fff",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `4px solid ${BLACK}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 800,
              color: GREEN,
              lineHeight: 1,
              letterSpacing: -1,
            }}
          >
            {amount}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6b7280",
              marginTop: 8,
            }}
          >
            Funding raised
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: BLACK }}>
            {deal.location || "India"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", width: 12, height: 12, background: ORANGE }} />
            <div style={{ display: "flex", fontSize: 24, color: "#6b7280", fontWeight: 600 }}>
              {year}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
