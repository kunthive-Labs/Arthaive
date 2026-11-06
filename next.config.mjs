import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `pg` is a native/CJS PostgreSQL driver: leave it external so Next never
  // bundles it and it is required straight from node_modules at runtime.
  serverExternalPackages: ["pg"],
  images: {
    // Vercel's built-in image optimizer handles these, so every remote host a
    // <Image> can render must be allow-listed here or the request 400s.
    remotePatterns: [
      // Supabase Storage avatars (lib/supabase/storage.ts -> getPublicUrl).
      { protocol: "https", hostname: "**.supabase.co" },
      // Google account photos from Better Auth social sign-in (`user.image`).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    // Content-Security-Policy is intentionally emitted as Report-Only (NOT
    // enforcing) so it cannot break the live site. Violations are reported to
    // the browser console only. Promote this to an enforcing
    // "Content-Security-Policy" header once the policy has been verified
    // against real traffic and no legitimate requests are being flagged.
    const contentSecurityPolicy = [
      "default-src 'self'",
      // 'unsafe-inline' for styles (and inline style attributes from UI libs);
      // 'unsafe-eval' is omitted so we don't loosen script execution.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // self + Supabase + Vercel + Sentry for XHR/fetch/websocket telemetry.
      // The app is first-party on Vercel now, so no extra origins are needed;
      // this policy is still Report-Only (see the note above) — verify against
      // real traffic before promoting it to enforcing.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app https://vitals.vercel-insights.com https://*.ingest.sentry.io https://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
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
