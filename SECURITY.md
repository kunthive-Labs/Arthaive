# Security Policy

Arthaive is a small, pre-1.0 open-source project. We take security issues
seriously and appreciate responsible disclosure. This document explains how to
report a vulnerability and what to expect in return.

## Supported Versions

Arthaive ships continuously from `main` and has no long-term support branches.
Only the latest release is supported; please reproduce and report issues against
the current `main` / latest deployment.

| Version            | Supported          |
| ------------------ | ------------------ |
| Latest `main` / `0.1.x` | :white_check_mark: |
| Older commits / tags    | :x:                |

## Reporting a Vulnerability

**Please report security issues privately. Do NOT open a public GitHub issue,
pull request, or discussion for a suspected vulnerability** — that exposes the
problem to everyone before it can be fixed.

Use one of these private channels:

1. **GitHub private vulnerability reporting (preferred, if enabled):** Go to the
   repository's **Security** tab → **"Report a vulnerability"**
   (github.com/kunthive-Labs/Arthaive).
2. **Email:** [8harath.k@gmail.com](mailto:8harath.k@gmail.com)

Please include as much of the following as you can:

- A clear **description** of the issue.
- **Reproduction steps** (or a proof-of-concept).
- The **affected component or endpoint** (e.g. a specific API v1 route, the
  sign-in gate, an admin view, a Supabase query).
- The **impact** — what an attacker could do with it.

## What to Expect

This is a side project maintained by one person, so the timelines below are
best-effort, not a contractual SLA:

- We aim to **acknowledge your report within a few days**.
- We'll **keep you updated** on triage and remediation progress.
- Once a fix ships, we're happy to **credit you publicly** if you'd like
  (let us know how you'd prefer to be named).

There is **no bug bounty** and no monetary reward — just our thanks.

## Scope

Arthaive is a Next.js 16 (App Router, TypeScript) application deployed on
**Vercel**, with server components and route handlers running as serverless
functions. Supabase provides PostgreSQL, Realtime, Storage, and the Data API;
Better Auth owns application sessions and Google OAuth, with its tables in a
private `better_auth` schema reached through the Supabase Supavisor pooler. The
application exposes a public REST API v1 with user-registerable API keys and
rate limits.

Cloudflare remains the DNS and TLS edge for the `kunthive.in` zone, but it is
**no longer the application runtime** and no longer proxies this hostname — see
the edge posture note below, which is a real change to the threat surface.

**In scope** (examples):

- Authentication/authorization bypass on the **sign-in gate** or the **admin gate**.
- Exposure of secrets — e.g. the **Supabase service-role key**, OAuth secrets, or
  any other credential.
- **SQL injection** or other injection into the database layer.
- **API-key or rate-limit bypass** on the public REST API v1.
- **Cross-site scripting (XSS)** or other client-side injection.
- **Cross-user data leakage** — reading or modifying another user's bookmarks,
  watchlist, saved searches, or notes.

**Out of scope** (examples):

- Volumetric or distributed **denial-of-service (DoS)** attacks.
- **Social engineering**, phishing, or physical attacks against maintainers/users.
- Vulnerabilities in **third-party services themselves** (Supabase, Vercel,
  Cloudflare, Google, Upstash, Sentry, Anthropic) — report those to the
  respective vendor.
- **Missing best-practice headers** or other hardening suggestions **without a
  demonstrated exploit**.

## Production Security Posture

This section records what actually protects the deployment, including where
coverage was deliberately given up. It is meant to track reality — if the stack
changes and this drifts, treat that as a bug.

### Edge protection: reduced, knowingly

`arthaive.kunthive.in` is a CNAME to Vercel with the **Cloudflare proxy turned
off (grey cloud)**. Cloudflare answers DNS for the zone and nothing more; TLS is
terminated by Vercel, which also owns the CDN.

The direct consequence is that **there is no Cloudflare WAF, bot management, or
Cloudflare L7 DDoS filtering in front of this hostname any more.** Traffic
reaches Vercel unfiltered by Cloudflare. What remains:

- Vercel's own platform-level DDoS mitigation and TLS termination.
- Application-level rate limiting (below).
- The response headers set in `next.config.mjs`.

This was an accepted trade-off, not an oversight: proxying through Cloudflare in
front of Vercel means two CDNs with independent cache invalidation, which
breaks ISR revalidation, image optimization, and streamed responses, and makes
Vercel's certificate provisioning fragile. Re-enabling the proxy is a possible
future hardening step and would require re-validating caching end to end.

Practically, this raises the importance of the application-level controls. A
volumetric DDoS is still out of scope for reports, but an **application-level
amplification or rate-limit bypass is now more valuable to an attacker than it
was**, and is firmly in scope.

### Rate limiting

Unchanged by the hosting move. `lib/rate-limit.ts` backs the public API v1 with
Upstash Redis using a sliding window, so limits hold across serverless instances
and cold starts. Tiers are 30/min unauthenticated and 120/min with an API key.

**When `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset it
degrades to a process-local in-memory bucket**, which on serverless means limits
are effectively per-instance and trivially outrun by spreading requests. With
the Cloudflare WAF gone this is the only throttle in the path, so Upstash should
be configured in production. A report demonstrating a practical bypass of the
distributed limiter is in scope.

### Fail-loud on missing configuration

`data/funding-data.ts` is an intentionally empty, type-bearing placeholder;
Supabase is the single runtime source of truth. To stop a credential
misconfiguration from silently serving a healthy-looking site with zero deals,
`requireSupabaseConfigured()` in `lib/supabase.ts` throws
`MissingSupabaseConfigError` at data-access time when Supabase is unconfigured
on a deployed environment.

It discriminates on `VERCEL_ENV` — deliberately **not** `NODE_ENV`, because
`next build` always sets `NODE_ENV=production` and gating on it would break
credential-free CI and local builds. `VERCEL_ENV=production` can never opt out.
Preview and Vercel-development deployments may opt in explicitly with
`ALLOW_MISSING_SUPABASE=1`; that flag is ignored in production. Off Vercel
entirely (CI, vitest, local dev) the behaviour stays permissive and warns once.

This is an availability/integrity guard rather than an access-control one, but
it is the kind of silent-failure mode worth reporting if you find a path around
it on a production deployment.

### Image optimizer host allow-list

Next.js image optimization is enabled on Vercel (it was disabled under Workers
only because that runtime has no optimizer). The optimizer **fetches remote URLs
server-side**, and `avatar_url` is user-supplied through
`PATCH /api/profile`, so an unbounded allow-list would turn the optimizer into a
server-side fetch proxy pointed at attacker-chosen origins.

Two allow-lists bound this and **must stay in sync**:

- `images.remotePatterns` in `next.config.mjs` — what the optimizer will fetch.
- `isAllowedAvatarUrl()` / `resolveAvatarUrl()` in `lib/avatar.ts` — what the
  write and render paths accept.

Both are limited to Supabase Storage (`*.supabase.co`) and Google account
photos (`lh3.googleusercontent.com`), https only. A way to get the optimizer to
fetch an origin outside that set is in scope, and so is a stored-URL path that
bypasses `lib/avatar.ts`.

### Privileged data access

The server validates the Better Auth session and then reads private data with
`SUPABASE_SERVICE_ROLE_KEY`, which **bypasses Row Level Security**, applying an
explicit `user_id` ownership filter in the query. Security therefore depends on
server-side session validation plus that filter, not on RLS. Any private route
handler that reads or writes without an ownership filter is a cross-user data
leak — the highest-value class of bug in this codebase. The service-role key
must never be exposed to the browser or prefixed `NEXT_PUBLIC_`.

### Response headers

Set from the `headers()` function in `next.config.mjs`, so they apply on Vercel
exactly as before: `Strict-Transport-Security`, `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`.

The Content-Security-Policy is deliberately emitted as
**`Content-Security-Policy-Report-Only`** and is therefore *not enforcing*.
Please do not report the non-enforcing CSP itself as a vulnerability — it is a
known, documented state pending validation against real traffic. A concrete XSS
that the eventual enforcing policy would not stop is still worth reporting.

## Data Accuracy Is Not a Security Issue

A wrong funding amount, stage, investor, date, or a missing/incorrect source link
is a **data quality issue, not a security vulnerability**. Please don't use the
security channels for these. Instead, file a **Data correction** issue through the
normal issue template — see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
