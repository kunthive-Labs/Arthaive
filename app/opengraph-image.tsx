import { ImageResponse } from "next/og"

// Branded social-share card (Open Graph + Twitter) for the site as a whole.
// Next.js auto-wires this file to og:image and twitter:image via the
// metadataBase set in app/layout.tsx. Rendered on the server with next/og
// (satori + resvg) — the dark headline card with the top-level corpus stats.
//
// NOTE: satori requires every element with more than one child to set an
// explicit `display: flex`, so the containers below all declare it.
export const alt = "Arthaive — Indian Startup Funding Intelligence"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg,#6366f1,#22d3ee)",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Arthaive</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Indian Startup Funding Intelligence
          </div>
          <div style={{ fontSize: 30, color: "#a1a1aa", maxWidth: 880 }}>
            Discover, analyze, and track funding across India — continuously from 2005 to today.
          </div>
        </div>

        <div style={{ display: "flex", gap: 56 }}>
          {[
            ["14,000+", "deals"],
            ["2005–2026", "coverage"],
            ["8,000+", "investors"],
          ].map(([big, small]) => (
            <div key={small} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 40, fontWeight: 800 }}>{big}</div>
              <div style={{ fontSize: 22, color: "#71717a", textTransform: "uppercase", letterSpacing: 2 }}>
                {small}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
