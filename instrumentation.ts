/**
 * Next.js instrumentation hook (Next 16).
 *
 * Initializes Sentry for the Node.js server and the Edge runtime. Everything is
 * guarded by a DSN check, so this is a complete no-op when neither
 * SENTRY_DSN nor NEXT_PUBLIC_SENTRY_DSN is set (local dev / preview without
 * Sentry). That keeps the no-env path clean: no network calls, no warnings.
 *
 * Sentry init is intentionally inlined here (rather than in separate
 * sentry.server.config.ts / sentry.edge.config.ts files) because those config
 * files are outside this change's file-ownership set.
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

export async function register() {
  if (!dsn) return

  const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      tracesSampleRate,
      environment: process.env.NODE_ENV,
    })
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate,
      environment: process.env.NODE_ENV,
    })
  }
}

// Captures errors thrown in React Server Components, route handlers, etc.
// Sentry.captureRequestError is a no-op-safe forwarder; if Sentry was never
// initialized (no DSN) it simply does nothing meaningful.
export const onRequestError = Sentry.captureRequestError
