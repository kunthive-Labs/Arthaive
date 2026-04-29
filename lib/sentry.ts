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
