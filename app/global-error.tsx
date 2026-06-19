"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

/**
 * Global error boundary (Next.js App Router).
 *
 * Catches errors thrown in the root layout/template that the per-segment
 * error.tsx boundaries cannot. It must render its own <html>/<body> because it
 * replaces the root layout when it triggers.
 *
 * Reports to Sentry via @sentry/nextjs directly. When no DSN is configured,
 * Sentry.captureException is a safe no-op, so this still renders the fallback
 * UI without errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              border: "4px solid black",
              background: "white",
              padding: "2rem",
              maxWidth: "28rem",
              width: "100%",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#4b5563", marginBottom: "1.5rem" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "black",
                color: "white",
                padding: "0.75rem 1.5rem",
                fontWeight: 700,
                border: "4px solid black",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
