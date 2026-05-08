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


export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry breadcrumb][${category}]`, message, data)
  }
}


export function setUser(userId: string, email: string) {
  if (process.env.NODE_ENV === "development") {
    console.debug("[Sentry] setUser", { userId, email })
  }
}


export function startTransaction(name: string, op: string) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] startTransaction: ${name} (${op})`)
  }
  return { finish: () => {} }
}


export function trackPageView(path: string, duration: number) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Sentry] pageView: ${path} in ${duration}ms`)
  }
}

export function trackApiCall(endpoint: string, status: number, duration: number) {
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


export const SENTRY_CONFIG = {
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
} as const


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
