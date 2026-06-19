/**
 * Observability layer.
 *
 * When a Sentry DSN is configured (NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN), the
 * capture/breadcrumb/user helpers forward to @sentry/nextjs. Without a DSN they
 * fall back to structured console logging — identical to the previous stub — so
 * the app works the same locally and in any env where Sentry is not set up.
 *
 * All exported names + signatures are preserved so existing callers (the
 * per-route error.tsx files import `captureException`, etc.) keep working
 * unchanged.
 */

import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"
const sentryEnabled =
  !!process.env.NEXT_PUBLIC_SENTRY_DSN || !!process.env.SENTRY_DSN

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (sentryEnabled) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
    return
  }
  if (isProd) {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }))
  } else {
    console.error("[error]", error, context)
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (sentryEnabled) {
    Sentry.captureMessage(message, level)
    return
  }
  if (isProd) {
    console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), message }))
  } else {
    console.log(`[${level}]`, message)
  }
}


export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (sentryEnabled) {
    Sentry.addBreadcrumb({ message, category, data })
    return
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry breadcrumb][${category}]`, message, data)
  }
}


export function setUser(userId: string, email: string) {
  if (sentryEnabled) {
    Sentry.setUser({ id: userId, email: email || undefined })
    return
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[Sentry] setUser", { userId, email })
  }
}


export function startTransaction(name: string, op: string) {
  if (sentryEnabled) {
    // Sentry v8+ uses spans; model a transaction as a manually-finished span.
    const span = Sentry.startInactiveSpan({ name, op })
    return { finish: () => span.end() }
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] startTransaction: ${name} (${op})`)
  }
  return { finish: () => {} }
}


export function trackPageView(path: string, duration: number) {
  if (sentryEnabled) {
    Sentry.addBreadcrumb({
      category: "navigation",
      message: `pageView: ${path}`,
      data: { path, duration },
    })
    return
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] pageView: ${path} in ${duration}ms`)
  }
}

export function trackApiCall(endpoint: string, status: number, duration: number) {
  if (sentryEnabled) {
    Sentry.addBreadcrumb({
      category: "http",
      message: `api: ${endpoint}`,
      data: { endpoint, status, duration },
    })
    return
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] api: ${endpoint} ${status} ${duration}ms`)
  }
}


export class PerfMeasure {
  private start: number
  constructor(private name: string) {
    this.start = performance.now()
  }
  end() {
    const duration = performance.now() - this.start
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Perf] ${this.name}: ${duration.toFixed(1)}ms`)
    }
    return duration
  }
}




export function logSlowQuery(query: string, durationMs: number, threshold = 500) {
  if (durationMs > threshold) {
    captureMessage(`Slow query: ${query} (${durationMs}ms)`, "warning")
  }
}


export function classifyError(err: unknown): "auth" | "network" | "data" | "unknown" {
  if (err instanceof Error) {
    if (err.message.includes("401") || err.message.includes("auth")) return "auth"
    if (err.message.includes("fetch") || err.message.includes("network")) return "network"
    if (err.message.includes("parse") || err.message.includes("JSON")) return "data"
  }
  return "unknown"
}


export function logStructuredError(
  err: unknown,
  context: { userId?: string; path?: string; action?: string }
) {
  const classification = classifyError(err)
  captureException(err, { ...context, classification })
  if (context.userId) setUser(context.userId, "")
}


export function getErrorRecoverySuggestion(err: unknown): string {
  const type = classifyError(err)
  switch (type) {
    case "auth": return "Please sign in again to continue."
    case "network": return "Check your connection and try again."
    case "data": return "The data could not be loaded. Try refreshing."
    default: return "Something went wrong. Please try again."
  }
}


export function assertProductionReady() {
  const missing = (["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY"] as string[])
    .filter((k) => !process.env[k])
  if (missing.length) {
    console.warn(`[Config] Missing env vars: ${missing.join(", ")}`)
  }
}
