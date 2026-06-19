import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

// Only enable Sentry build-time instrumentation (source map upload, release
// tagging) when the relevant env vars are present. Locally — where SENTRY_*
// is unset — withSentryConfig still wraps the config but uploads nothing and
// does not require auth, so it is a no-op and never breaks the build.
const sentryEnabled = Boolean(
  process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_AUTH_TOKEN
)

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Silence noisy logs unless we are actually wired up.
  silent: !sentryEnabled,
  // Don't attempt source map upload without an auth token.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Keep CI builds resilient: a Sentry hiccup must not fail the Next build.
  errorHandler: () => {},
  widenClientFileUpload: true,
}

export default withSentryConfig(nextConfig, sentryBuildOptions)
