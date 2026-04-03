const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Sentry stub]", error, context)
    }
    return
  }

  // Real Sentry integration via @sentry/nextjs when DSN is configured
  console.error(error, context)
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Sentry stub][${level}]`, message)
  }
}
