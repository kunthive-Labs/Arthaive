# Arthaive deployment guide

Arthaive is deployed on **Vercel** as a standard Next.js 16 App Router
application. Vercel builds the app, hosts the static assets, runs the server
components and route handlers as serverless functions, and terminates TLS for
`arthaive.kunthive.in`.

Supabase remains the database, auth store, object storage, and Realtime source.
Cloudflare remains in the picture **only as DNS and TLS edge for the
`kunthive.in` zone** — it is no longer the application runtime. The DNS record
for `arthaive.kunthive.in` is a CNAME to Vercel with the Cloudflare proxy
**off** (grey cloud), so requests reach Vercel directly.

> Doing a first-time switch from the old Cloudflare Workers deployment? Follow
> [`VERCEL_CUTOVER_RUNBOOK.md`](VERCEL_CUTOVER_RUNBOOK.md) for the ordered
> operator checklist. This document is the steady-state reference.

Authorization is enforced inside protected pages and route handlers — the app
does not rely on an edge WAF or on Next.js middleware for the auth gate.

## Prerequisites

- Node.js 22 or newer
- A Vercel account with access to the Arthaive project
- A Supabase project (PostgreSQL, Storage, Realtime, Data API)
- Google OAuth web-application credentials
- Access to the Cloudflare DNS zone for `kunthive.in` (DNS records only)

Install the locked dependencies with:

```bash
npm ci
```

The Vercel CLI (`npm i -g vercel`) is optional. It is useful for pulling
environment variables locally and for inspecting builds, but it is not required
for deployment — deploys are driven by the Git integration.

## Local development

```bash
npm run dev
```

That is the only local runtime. There is no separate Worker/`workerd` preview
step any more; the previous `npm run preview` path was an OpenNext/Wrangler
artifact and has been removed along with `.dev.vars`. What runs locally is the
same Next.js server that Vercel builds.

Create an ignored `.env.local` from the template and fill it in:

```bash
cp .env.example .env.local
```

Use `http://localhost:3000` for `BETTER_AUTH_URL`, `NEXT_PUBLIC_BASE_URL`, and
`NEXT_PUBLIC_APP_URL` locally, and register
`http://localhost:3000/api/auth/callback/google` as a Google OAuth redirect URI.

Optionally, pull the project's Development-scope variables from Vercel instead
of maintaining them by hand:

```bash
npx vercel link
npx vercel env pull .env.local
```

Never commit `.env.local`.

## Environment variables

Vercel keeps three environment scopes: **Production**, **Preview**, and
**Development**. Set variables under
`Project -> Settings -> Environment Variables` and tick the scopes each value
applies to.

| Scope | Applies to | Notes |
| --- | --- | --- |
| Production | Deployments of the production branch (`main`) | The real Supabase project, the real Google OAuth client, `https://arthaive.kunthive.in` as the canonical origin |
| Preview | Every other branch and pull request | Prefer staging Supabase credentials. The canonical URL differs per deployment — see below |
| Development | `vercel env pull` / `vercel dev` | Convenience only; `npm run dev` reads `.env.local` |

`.env.example` is the authoritative list of variable names. The full inventory
with "where each value comes from" is tabulated in
[`EXISTING_SUPABASE_VERCEL_MIGRATION.md`](EXISTING_SUPABASE_VERCEL_MIGRATION.md).

### Required in Production

```text
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_VERSION
```

Optional, feature-gated, and degrading gracefully when unset:
`ANTHROPIC_API_KEY`, `AI_MONTHLY_BUDGET_USD`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, and the `SENTRY_*` / `NEXT_PUBLIC_SENTRY_*` set.

Mark `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`,
and `SENTRY_AUTH_TOKEN` as **Sensitive** in Vercel so their values cannot be
read back from the dashboard or the API.

Do not set `NODE_ENV`, `VERCEL_URL`, `VERCEL_ENV`, or `NEXT_RUNTIME` yourself.
Vercel populates those.

### The `NEXT_PUBLIC_*` build-time inlining caveat

`NEXT_PUBLIC_*` values are **inlined into the JavaScript bundle by
`next build`**. They are not read at request time. Three consequences:

1. A `NEXT_PUBLIC_*` variable must exist in the environment scope that the
   **build** runs in, not just at runtime. On Vercel a single scope covers
   both, so this mostly takes care of itself — but it does mean a variable
   ticked only for Production will be missing from Preview builds.
2. **Changing a `NEXT_PUBLIC_*` value does not take effect until you
   redeploy.** Editing it in the dashboard and restarting nothing will leave
   the old value baked into the shipped bundle. Trigger a fresh deployment.
3. Never put a secret behind a `NEXT_PUBLIC_` prefix. Anything so prefixed is
   published to every browser. In particular `SUPABASE_SERVICE_ROLE_KEY` must
   stay unprefixed and server-only.

### Preview deployments and the canonical URL

`BETTER_AUTH_URL` must match the origin the browser is actually on, or Better
Auth will reject the OAuth callback. Preview deployments get a generated URL
per commit, which cannot be enumerated in Google's redirect-URI allowlist.

The workable setup is to point the Preview scope at the project's **stable**
alias rather than the per-commit URL:

```text
BETTER_AUTH_URL=https://<vercel-project>.vercel.app
NEXT_PUBLIC_BASE_URL=https://<vercel-project>.vercel.app
NEXT_PUBLIC_APP_URL=https://<vercel-project>.vercel.app
```

`<vercel-project>` is the Vercel project name — an operator-supplied value; read
it off the project's Domains tab. Register
`https://<vercel-project>.vercel.app/api/auth/callback/google` in the Google
OAuth client alongside the production callback.

Sign-in on a *per-commit* preview URL will still fail the redirect-URI check.
That is expected. Test auth against the stable alias or against production.

## Region and function configuration

`vercel.json` is the deployment source of truth for platform settings:

```json
{
  "framework": "nextjs",
  "regions": ["bom1"],
  "cleanUrls": true,
  "functions": {
    "app/api/chat/route.ts": { "maxDuration": 60 },
    "app/api/search/nl/route.ts": { "maxDuration": 60 }
  }
}
```

- **`regions: ["bom1"]`** pins serverless functions to Mumbai. Arthaive's
  audience and its Supabase project are both India-centric, so co-locating the
  functions with the database is what keeps per-request database round trips
  cheap. A function in, say, `iad1` would pay a cross-continent round trip on
  every Supabase query. Confirm the Supabase project region matches; if
  Supabase lives elsewhere, revisit this choice rather than assuming `bom1`.
- **`maxDuration: 60`** covers the two Anthropic-backed routes
  (`/api/chat` and `/api/search/nl`). Model calls can exceed the shorter default
  timeout, and a truncated response surfaces as a generic 504 rather than the
  route's own error handling. Every other route keeps the platform default.
  Note that the maximum permitted `maxDuration` depends on the Vercel plan;
  if a deployment errors on this setting, the plan is the constraint.
- **`cleanUrls`** strips `.html` suffixes. Unchanged from before.

## How deploys are triggered

Deployment is handled by **Vercel's native Git integration**. There is no
deploy job in GitHub Actions and no Vercel API token stored in the repository.

- Push or merge to `main` → Production deployment.
- Push to any other branch, or open a pull request → Preview deployment, with
  the URL posted back onto the PR.
- `Deployments -> ... -> Redeploy` in the dashboard re-runs a build, optionally
  without the build cache. Use this after changing a `NEXT_PUBLIC_*` value.
- Rolling back is `Deployments -> a previous Production build -> Promote to
  Production`. This is an atomic alias switch and does not rebuild.

`.github/workflows/ci.yml` still runs lint, typecheck, tests, and `npm run
build` on every push and pull request. It is a correctness gate, not a
deployment path — Vercel builds independently. The scheduled funding pipeline
(`.github/workflows/pipeline.yml`) and the GitHub Pages landing-site workflow
(`.github/workflows/deploy-landing.yml`) are unrelated to app hosting and are
unaffected.

Note that the marketing landing page in `landing/` publishes to
`arthaive.labs.kunthive.in` via GitHub Pages (see the top-level `CNAME`). That
is a different hostname from the application at `arthaive.kunthive.in` and is
not served by Vercel.

## Domain and TLS

`arthaive.kunthive.in` is added as a domain on the Vercel project. In the
Cloudflare DNS zone for `kunthive.in` it is a **CNAME to Vercel with the proxy
turned off (grey cloud)**.

This is deliberate and settled:

- Vercel terminates TLS and issues/renews the certificate for the hostname.
  With the proxy on, Cloudflare would terminate TLS instead and Vercel's
  certificate provisioning (an HTTP/TXT challenge to the real origin) becomes
  fragile.
- Vercel owns the CDN. Stacking Cloudflare's cache in front of Vercel's would
  give two caches with independent invalidation, which is the fastest way to
  break ISR revalidation, image optimization, and streamed responses.
- **Trade-off, accepted:** there is no Cloudflare WAF, bot management, or DDoS
  filtering on this hostname. Rate limiting is the application's own Upstash
  Redis limiter, and the security headers come from `next.config.mjs`. Turning
  the proxy on later is a possible follow-up; it is explicitly out of scope
  now and would require re-validating caching behavior end to end.

## Caching and image optimization

Vercel serves the Next.js build output natively:

- Static assets under `/_next/static/` get immutable cache headers
  automatically. The old `public/_headers` file was a Cloudflare-specific
  mechanism and has been removed.
- ISR and on-demand revalidation work out of the box. No R2 bucket, queue, or
  cache adapter to provision.
- **Image optimization is enabled.** It was previously disabled
  (`images.unoptimized`) purely because the Workers runtime has no native
  optimizer; that constraint is gone. Every remote host a `<Image>` may render
  must be allow-listed in `next.config.mjs` under `images.remotePatterns` or
  the request returns a 400. Currently allow-listed: `**.supabase.co`
  (Storage avatars) and `lh3.googleusercontent.com` (Google account photos from
  Better Auth sign-in).
- Security headers, including the Report-Only CSP, are emitted from the
  `headers()` function in `next.config.mjs` and therefore apply on Vercel
  exactly as they did before.

## Database connections from serverless functions

Better Auth connects to PostgreSQL with the `pg` driver. On Vercel this
**must** go through the Supabase **Supavisor pooler**, not a direct connection.

Two independent reasons:

1. **IPv6.** A direct Supabase database connection
   (`db.<project-ref>.supabase.co`) resolves to IPv6 only unless the IPv4
   add-on is purchased. Vercel's serverless functions have no IPv6 egress, so a
   direct connection simply cannot be established. The Supavisor pooler is
   reachable over IPv4.
2. **Connection count.** Each concurrent serverless invocation can hold its own
   pool. A per-instance pool of any meaningful size multiplied by concurrency
   exhausts Postgres' connection limit quickly. The pool `max` is therefore
   **1** — one connection per function instance, with Supavisor doing the real
   multiplexing.

### Use the SESSION pooler on port 5432

This is verified, not inferred. Better Auth's tables live in the non-default
`better_auth` schema and are addressed unqualified, so the connection's
`search_path` must be pinned. Session mode holds a dedicated backend for the
connection's lifetime, so both the startup `options` packet and an explicit
`SET` behave exactly as they would on a direct connection.

```text
Session mode      port 5432   dedicated backend per connection; search_path holds   <- use this
Transaction mode  port 6543   backends reassigned between transactions; session state can be lost
```

Port 6543 does connect, and a single-client test against it passes — but that
result is meaningless, because with one client and zero contention every
statement lands on the same backend. Under real concurrency Supavisor reassigns
backends between transactions and the pinned `search_path` can vanish, which
surfaces as `relation "user" does not exist`. `lib/auth.ts` warns at startup if
it sees port 6543, and re-verifies the effective `search_path` on every physical
connection so the failure is loud rather than silent.

### The connection string

```text
DATABASE_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

For this project the pooler host is `aws-1-ap-south-1.pooler.supabase.com`.
Note **`aws-1`**, not `aws-0` — the `aws-0-…` host exists but returns
`Tenant or user not found` for this project. Copy the host from the Supabase
dashboard under `Connect` rather than assuming the numbering. `ap-south-1`
(Mumbai) is also what makes the `bom1` function region the correct
co-location choice.

Measured DNS, which is the concrete form of the IPv6 problem above:

| Host | Records |
| --- | --- |
| `db.<project-ref>.supabase.co` (direct) | AAAA only — **no A record** |
| `aws-1-ap-south-1.pooler.supabase.com` | 3 × A, no AAAA |

Other details:

- The username is `postgres.<project-ref>`, **not** `postgres`. Keep the
  project ref suffix exactly as Supabase prints it.
- Percent-encode reserved characters in the password.

### Do not append `?sslmode=require`

**Leave `sslmode` off the URL entirely.** The Supabase dashboard's copy-paste
string includes `?sslmode=require`, and pasting that verbatim breaks every
connection:

- `pg` >= 8.11 parses `sslmode=require|prefer|verify-ca` as **verify-full**, and
  a value in the URL overrides any `ssl` option passed to the `Pool`.
- Supabase serves a certificate chained to its own private *Supabase Root 2021
  CA*, which is not in Node's trust store.
- The handshake therefore fails with `SELF_SIGNED_CERT_IN_CHAIN`
  (openssl verify code 19).

Dropping the parameter is safe — it does **not** mean plaintext. `lib/auth.ts`
strips `sslmode`, `uselibpqcompat`, and `sslrootcert` for Supabase hosts and
configures TLS itself, so traffic is always encrypted. (A URL with no `sslmode`
handed to a bare `pg` client *would* connect in plaintext; that is exactly why
the driver config owns TLS rather than the URL.)

By default the certificate is encrypted-but-unverified, equivalent to
`sslmode=no-verify` and matching Supabase's own guidance. To upgrade to real
verification, download the CA from
`Project Settings -> Database -> SSL configuration` and paste the PEM into the
optional `DATABASE_SSL_CA` environment variable; `lib/auth.ts` then sets
`rejectUnauthorized: true`.

### Verify before you ship

```bash
npm run check-db              # reads .env.local
npm run check-db -- --strict  # hard-fail on anything Vercel cannot use
```

The preflight resolves DNS, checks IPv4 reachability, negotiates TLS, and
asserts that the `better_auth` schema exists, is usable by the role, has all
four tables, and is actually pinned onto the connection's `search_path`. Under
`--strict` a direct IPv6-only host, the transaction pooler, or an unhonoured
`search_path` are hard failures — use that form in a pre-deploy gate.

To check a specific candidate URL:

```bash
DATABASE_URL='postgresql://...' node scripts/check-db.mjs --strict
```

## Funding pipeline secrets

The scheduled GitHub Actions pipeline
(`.github/workflows/pipeline.yml`) requires these **repository** secrets. They
are GitHub secrets, not Vercel environment variables — the pipeline runs in
Actions and writes directly to Supabase without going through the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`ANTHROPIC_API_KEY` is optional. When it is absent, the workflow explicitly
runs the rule-based extractor with `--no-ai` instead of failing after discovery.

This workflow is unaffected by the move to Vercel.

## Updating the funding fixture

`data/funding-data.ts` is **deliberately stubbed to an empty array**. Supabase
is the single runtime source of truth for deal data; there is no static
fallback dataset shipped in the bundle.

The generator still exists and `prebuild`/`predev` still invoke it, so the file
is regenerated on every build and keeps its exported `FundingDeal` type — which
many modules import. Regenerate it manually with:

```bash
npm run generate-data
```

Two things follow from the stub, and both matter operationally:

- **A missing or misconfigured Supabase in production is a hard failure, not a
  silent empty page.** Previously an unset `NEXT_PUBLIC_SUPABASE_URL` would
  quietly fall through to the fixture and render plausible-looking data. Now it
  fails loudly. That is intentional: a site rendering "0 deals" because a
  variable was mistyped is worse than a site that refuses to start.
- Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` are present in the Production scope **before**
  promoting a deployment.

If you ever want a real fixture back — for offline demos or deterministic
tests — regenerate it from the CSV corpus in `funding_data/` with
`npm run generate-data` and remove the stub in
`scripts/generate-funding-data.js`. That is a deliberate change, not a default.

## Production checklist

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run check-db -- --strict
```

Then confirm in the Vercel dashboard:

- [ ] All required Production variables are set, secrets marked Sensitive.
- [ ] `BETTER_AUTH_URL` is exactly `https://arthaive.kunthive.in`.
- [ ] The Google OAuth client lists
      `https://arthaive.kunthive.in/api/auth/callback/google`.
- [ ] `arthaive.kunthive.in` shows as Valid on the project's Domains tab.
- [ ] The Cloudflare DNS record for it is a CNAME, proxy **off**.
- [ ] Sentry is receiving events from the Production deployment.

Then submit `/sitemap.xml` to Google Search Console.
