/**
 * Next.js client-side instrumentation (Next 15/16, @sentry/nextjs).
 *
 * instrumentation.ts only initializes Sentry for the nodejs + edge runtimes,
 * so browser-thrown errors went uncaptured. This file runs in the browser and
 * initializes the client SDK.
 *
 * Mirrors the server init in instrumentation.ts: same DSN resolution,
 * tracesSampleRate, and environment. Guarded by a DSN check so it is a complete
 * no-op when NEXT_PUBLIC_SENTRY_DSN is unset (local dev / preview without
 * Sentry) — no network calls, no warnings.
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const tracesSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
    : process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0.1

  Sentry.init({
    dsn,
    tracesSampleRate,
    environment: process.env.NODE_ENV,
  })
}

// Instruments client-side router navigations for tracing. Safe no-op when
// Sentry was never initialized (no DSN).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
