# Vercel cutover runbook

Operator checklist for moving Arthaive's application hosting from Cloudflare
Workers (OpenNext adapter) to Vercel, keeping the domain
`arthaive.kunthive.in` and keeping Supabase exactly as it is.

Work through the steps in order. Do not skip ahead to the DNS step — the whole
design of this cutover is that everything is proven on a `*.vercel.app` URL
first, so the DNS flip is the only irreversible-feeling moment and it is
reversible in minutes.

> ### RESOLVED — the Better Auth backfill blocker is closed
>
> `better_auth."user"` previously had **0 rows**, which would have cost every
> existing user their account at cutover. Root cause: migration
> `023_cutover_to_better_auth.sql` had never been applied to this project —
> `022` had. It was applied on **2026-08-21** inside a single transaction,
> gated on eight verification checks, with a pre-migration backup taken first.
>
> All 4 users are present with their original UUIDs, and all 7 dashboards
> remain attached to their owners. **Step 4b** is now a re-confirmation, not an
> investigation. Re-run it anyway before DNS — it is cheap, and it proves the
> environment you are about to cut over is the one that was fixed.

## Scope

**What changes:** where the Next.js application runs.

**What does not change:** the Supabase project, the database schema, the
`arthaive.kunthive.in` hostname, the Google OAuth production callback, the
funding pipeline in GitHub Actions, and the landing site at
`arthaive.labs.kunthive.in` (GitHub Pages, separate hostname, untouched).

**Settled decisions, not open questions:**

1. Cloudflare becomes **DNS-only** for this hostname — CNAME to Vercel, proxy
   **off** (grey cloud). Vercel terminates TLS and owns the CDN. Accepted
   trade-off: no Cloudflare WAF in front of `arthaive.kunthive.in`.
2. `data/funding-data.ts` stays stubbed to an empty array. Supabase is the only
   runtime data source, and a misconfigured Supabase fails loudly in production
   rather than rendering zero deals.
3. The two Cloudflare Workers are **not deleted** during cutover. They stay
   deployed but off-route so rollback is a DNS flip. Deleting them is a
   deferred manual step after the soak period (step 11).

## Prerequisites

- [ ] Vercel account with permission to create a project in the target team.
- [ ] Owner/admin on the GitHub repository (to authorize the Vercel Git app).
- [ ] Cloudflare access to the `kunthive.in` DNS zone.
- [ ] Google Cloud Console access to the Arthaive OAuth web client.
- [ ] Supabase dashboard access (Connect string, API keys).
- [ ] A recent Supabase backup or a known-good recovery point.
- [ ] The current production secret values, from the existing Worker config or
      your password manager. You cannot read Worker secret *values* back out of
      Cloudflare — if any value is not recorded somewhere, source it again from
      Supabase/Google/Sentry before you start.

Record these operator-supplied values up front; they are referenced throughout:

| Placeholder | Where to get it | Value |
| --- | --- | --- |
| `<vercel-team>` | Vercel dashboard | |
| `<vercel-project>` | Chosen in step 1; the `*.vercel.app` subdomain | |
| `<supabase-project-ref>` | Supabase URL, `https://<ref>.supabase.co` | |
| `<supabase-region>` | Verified: `ap-south-1`; pooler host `aws-1-ap-south-1.pooler.supabase.com` | |
| `<vercel-dns-target>` | Vercel Domains tab shows the exact CNAME target | |

---

## Step 1 — Create the Vercel project and connect Git

1. Vercel dashboard → **Add New… → Project**.
2. Import the `kunthive-Labs/Arthaive` repository. Authorize the Vercel GitHub
   App for that repository if prompted.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: repository root. Do **not** point it at `landing/`.
5. Leave Build/Install/Output commands on their defaults — `vercel.json`
   already declares `buildCommand`, `installCommand`, `devCommand`,
   `framework`, `regions`, `cleanUrls`, and per-route `maxDuration`.
6. Production branch: `main`.
7. Node.js version: **22.x** (Project → Settings → General).
8. **Do not deploy yet.** Cancel out of the first build if it starts, or let it
   fail — the environment variables are not in place. Add them first (step 2),
   then redeploy.

Note the generated project name; it determines `<vercel-project>.vercel.app`.

## Step 2 — Environment variables

Project → Settings → **Environment Variables**. For each variable, tick the
scopes it applies to and mark the sensitive ones **Sensitive** so their values
cannot be read back.

Because `NEXT_PUBLIC_*` values are inlined by `next build`, a variable ticked
only for Production will be absent from Preview builds. Tick both scopes for
anything the app needs in either.

### Required — Production scope

| Variable | Sensitive | Production value | Source |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Session pooler, port 5432, **no** `sslmode` suffix (step 4) | Supabase → Connect |
| `BETTER_AUTH_SECRET` | Yes | The **existing** production secret — do not regenerate | Password manager |
| `BETTER_AUTH_URL` | No | `https://arthaive.kunthive.in` | Fixed |
| `GOOGLE_CLIENT_ID` | No | `<id>.apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | | Google Cloud Console |
| `NEXT_PUBLIC_SUPABASE_URL` | No | `https://<supabase-project-ref>.supabase.co` | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | publishable / legacy anon key | Supabase → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | secret / legacy service-role key | Supabase → API Keys |
| `ADMIN_EMAILS` | Yes | comma-separated allowlist | Your admin list |
| `NEXT_PUBLIC_BASE_URL` | No | `https://arthaive.kunthive.in` | Fixed |
| `NEXT_PUBLIC_APP_URL` | No | `https://arthaive.kunthive.in` | Fixed |
| `NEXT_PUBLIC_APP_VERSION` | No | `0.1.0` | Release policy |

> `BETTER_AUTH_SECRET` must be **identical** to the value the Workers
> deployment uses. Generating a new one invalidates every existing session and
> forces a global sign-out on cutover. That is avoidable — reuse the value.

The four URL/version variables above (`BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_VERSION`) were previously plaintext
`vars` in `wrangler.jsonc`; the eight others were declared there as required
Worker secrets. This table is the complete replacement for both.

### Required — Preview scope

Same variable names, but the three origin variables point at the project's
stable alias so OAuth callbacks resolve to a URL you can register with Google:

```text
BETTER_AUTH_URL=https://<vercel-project>.vercel.app
NEXT_PUBLIC_BASE_URL=https://<vercel-project>.vercel.app
NEXT_PUBLIC_APP_URL=https://<vercel-project>.vercel.app
```

Prefer a **staging** Supabase project and a staging `BETTER_AUTH_SECRET` for
Preview if one exists. If Preview points at production Supabase, be aware that
preview branches then write to real user data.

### Optional — set only if the feature is in use

| Variable | Sensitive | Behavior when absent |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | AI summaries, NL search, classification degrade gracefully |
| `AI_MONTHLY_BUDGET_USD` | No | Defaults to USD 50 |
| `UPSTASH_REDIS_REST_URL` | No | Rate limiting disabled (all requests allowed) |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Must be set together with the URL |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Browser monitoring disabled |
| `SENTRY_DSN` | Yes | Server monitoring disabled |
| `SENTRY_ORG` | No | Source-map upload not configured |
| `SENTRY_PROJECT` | No | Source-map upload not configured |
| `SENTRY_AUTH_TOKEN` | Yes | Source maps not uploaded |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | SDK default |
| `SENTRY_TRACES_SAMPLE_RATE` | No | SDK default |

With no Upstash configured, the public API v1 has **no rate limiting at all**.
Since Cloudflare's edge protections also go away with the grey cloud, set
Upstash before cutover rather than after.

### Do not set

`NODE_ENV`, `VERCEL_ENV`, `VERCEL_URL`, `NEXT_RUNTIME`, or any
`CLOUDFLARE_*` / `NEXTJS_ENV` variable. The first four are platform-populated;
the rest are dead with the Workers adapter.

## Step 3 — Google OAuth redirect URIs

Google Cloud Console → **APIs & Services → Credentials** → the Arthaive OAuth
web client → **Authorized redirect URIs**.

The production callback is **unchanged** — the domain is preserved, so nothing
about it moves:

```text
https://arthaive.kunthive.in/api/auth/callback/google
```

**Add** the preview callback:

```text
https://<vercel-project>.vercel.app/api/auth/callback/google
```

Keep for local development:

```text
http://localhost:3000/api/auth/callback/google
```

**Remove** the Worker preview callback if present, since that runtime is gone:

```text
http://localhost:8787/api/auth/callback/google
```

Scheme, host, port, path, and trailing slash must match exactly, or Google
returns `redirect_uri_mismatch`. Google can take a few minutes to propagate a
redirect-URI change.

Per-commit preview URLs (`<project>-<hash>-<team>.vercel.app`) cannot be
enumerated in the allowlist. Sign-in will fail on those. Test auth on the
stable alias or on production.

## Step 4 — Database connection and preflight

Better Auth's tables live in the non-default `better_auth` PostgreSQL schema,
pinned via a connection startup option in `lib/auth.ts`. On Vercel the
connection **must** go through the Supabase **Supavisor SESSION pooler on port
5432**. This is verified against the project, not inferred.

### Why the pooler, and why session mode

- **IPv6.** Measured for this project: the direct endpoint
  `db.<supabase-project-ref>.supabase.co` publishes **AAAA records only, no A
  record**. Vercel serverless functions have no IPv6 egress, so a direct
  connection cannot be established at all. The pooler host publishes 3 IPv4
  addresses and no AAAA.
- **Session vs transaction.** Session mode (5432) holds a dedicated backend for
  the connection's lifetime, so the startup `options` packet and an explicit
  `SET search_path` behave exactly as on a direct connection. Transaction mode
  (6543) reassigns backends between transactions and can lose that state,
  producing `relation "user" does not exist`.
- Port 6543 *does* connect and a single-client test against it passes — **that
  pass is meaningless**, because with one client and no contention every
  statement hits the same backend. Do not treat it as validation.
- **Connection budget.** Serverless scales by process, so the driver pool is
  `max: 1` per instance and Supavisor does the real fan-out.

### The connection string

```text
DATABASE_URL=postgresql://postgres.<supabase-project-ref>:<url-encoded-password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

- Host for this project is `aws-1-ap-south-1.pooler.supabase.com`. Note
  **`aws-1`**, not `aws-0` — `aws-0-…` resolves but returns
  `Tenant or user not found` here. Copy it from Supabase → **Connect**.
  `ap-south-1` (Mumbai) also confirms `regions: ["bom1"]` is correctly
  co-located.
- Username is `postgres.<supabase-project-ref>`, **not** `postgres`.
- Percent-encode reserved characters in the password.

### Do NOT append `?sslmode=require`

**Leave `sslmode` off the URL entirely**, even though the Supabase dashboard's
copy-paste string includes it. Pasting it verbatim breaks every connection:
`pg` >= 8.11 parses `sslmode=require` as verify-full and lets the URL override
the driver's `ssl` option, while Supabase's certificate chains to its own
private *Supabase Root 2021 CA* which Node does not trust. The handshake fails
with `SELF_SIGNED_CERT_IN_CHAIN`.

Omitting it does not mean plaintext: `lib/auth.ts` strips `sslmode`,
`uselibpqcompat`, and `sslrootcert` for Supabase hosts and configures TLS in the
driver. For full certificate verification, download the CA from
`Project Settings → Database → SSL configuration` and paste the PEM into the
optional `DATABASE_SSL_CA` variable.

### Run the preflight before cutover

```bash
npm run check-db -- --strict
```

or against a specific candidate:

```bash
DATABASE_URL='postgresql://...' node scripts/check-db.mjs --strict
```

It resolves DNS, checks IPv4 reachability, negotiates TLS, and asserts that the
`better_auth` schema exists, is usable by the role, has all four tables, and is
actually pinned onto the connection's `search_path`. Under `--strict` a direct
IPv6-only host, the transaction pooler, or an unhonoured `search_path` are hard
failures.

- [ ] `npm run check-db -- --strict` exits 0 against the production URL.

**Do not proceed on a failing or skipped preflight.**

---

## Step 4b — Re-confirm the Better Auth backfill

> **Previously a hard gate. Resolved on 2026-08-21 — now a re-confirmation.**

**What was wrong:** `better_auth."user"` contained **0 rows**. Migration `022`
(which creates the `better_auth` schema) had been applied to this project;
migration `023_cutover_to_better_auth.sql` (which backfills users from
`auth.users` and repoints everything at the new table) **never had**. Four
independent symptoms all traced to that single omission:

| Symptom | Before | After `023` |
| --- | --- | --- |
| `better_auth."user"` | 0 rows | 4 users, original UUIDs |
| `on_auth_user_created` on `auth.users` | still present | dropped |
| `on_better_auth_user_created` | missing | created |
| `public.profiles.id` references | `auth.users` | `better_auth."user"` |
| `public.api_keys.user_id` | column absent | added |

The consequence had it gone unnoticed: a Google sign-in would have minted a
**new** UUID rather than matching the existing one, so bookmarks, watchlists,
saved searches, notes and dashboards would have stayed in the database owned by
UUIDs no Better Auth user row claimed. `better_auth."verification"` already held
2 rows — a sign-in had been attempted and had failed exactly this way.

**How it was applied:** a pre-migration backup was written outside the repo
(`arthaive-db-backups/pre-023-<timestamp>.sql`, containing the data plus DDL for
the foreign key, function, trigger and all 9 RLS policies `023` drops), then
`023` ran inside a single `BEGIN`/`COMMIT` gated on eight checks, set to
`ROLLBACK` if any failed. All eight passed.

**Re-confirm before moving DNS.** Cheap, and it proves the environment you are
cutting over is the one that was fixed:

1. Confirm `DATABASE_URL` points at the Supabase project holding production
   `auth.users`.
2. Run the **user-count parity** and **preserved user IDs** queries from Phase
   14 of
   [`EXISTING_SUPABASE_VERCEL_MIGRATION.md`](EXISTING_SUPABASE_VERCEL_MIGRATION.md).
   Parity between `auth.users` (email-bearing) and `better_auth."user"`, with
   zero rows from the preserved-ID query, is the definition of resolved.

- [ ] `better_auth."user"` row count matches `auth.users` (email-bearing).
- [ ] The preserved-user-ID query returns zero rows.
- [ ] `public.profiles.id` references `better_auth."user"(id)`.
- [ ] A real Google sign-in reuses the existing UUID rather than minting a new
      one. This is the one check the SQL cannot make for you — do it on the
      `*.vercel.app` URL in Step 5, before DNS.

`023` is safe to re-run if you are unsure whether it applied: the backfill is
`ON CONFLICT DO UPDATE`, the drops are `IF EXISTS`, and the column add is
`IF NOT EXISTS`.

## Step 5 — First Vercel build, verified on `*.vercel.app`

1. Trigger a Production deployment (push to `main`, or **Redeploy** the failed
   first build now that variables exist).
2. Watch the build log. It should run `prebuild` (`generate-funding-data`) then
   `next build`. There must be no OpenNext, Wrangler, or `workerd` steps.
3. When it succeeds, open the deployment's `*.vercel.app` URL. **Do not touch
   DNS yet.**

The production alias `https://arthaive.kunthive.in` will not resolve to Vercel
at this point, so `BETTER_AUTH_URL` does not match the origin you are browsing.
Sign-in on the `*.vercel.app` URL will therefore fail the redirect check — that
is expected and is not a bug. Verify everything that does not require a signed-in
session here:

- [ ] Home, `/explore`, `/analytics`, `/investors`, `/sectors` render with real
      Supabase data — not empty. An empty page means Supabase variables are
      wrong; the fixture is stubbed and will not paper over it.
- [ ] `/deal/<some-real-id>` renders.
- [ ] `/live` connects to Supabase Realtime and shows the feed.
- [ ] `/api/v1/funding-rounds?limit=5` returns rows.
- [ ] `/api-docs` renders.
- [ ] `/opengraph-image` returns a PNG (rendered in-app by `next/og`, not by
      the standalone Worker any more).
- [ ] `/deal/<id>/opengraph-image` returns a PNG.
- [ ] `/sitemap.xml` and `/robots.txt` respond.
- [ ] An `<Image>`-rendered avatar loads through `/_next/image?...` and returns
      an optimized response, not a 400. A 400 means the remote host is missing
      from `images.remotePatterns` in `next.config.mjs`.
- [ ] Sentry receives an event from this deployment.

Fix anything broken here. Every problem is cheaper to fix before DNS moves.

## Step 6 — Add the domain to the Vercel project

Project → Settings → **Domains** → Add `arthaive.kunthive.in`.

Vercel will show the DNS record it expects and mark the domain **Invalid
Configuration** until DNS points at it. Copy the exact CNAME target it displays
into `<vercel-dns-target>`; use what the dashboard shows rather than a value
remembered from another project.

Vercel cannot issue the TLS certificate until DNS resolves to it, so this step
stays amber until step 7 completes. That is expected.

## Step 7 — The DNS switch in Cloudflare

This is the cutover. Everything before it was reversible by doing nothing.

**Gate check — all four must be true before you change a record:**

- [ ] Step 4 preflight (`npm run check-db -- --strict`) passes.
- [ ] Step 4b re-confirmed: `better_auth."user"` is populated (applied 2026-08-21), or 0 rows has been
      explicitly accepted as correct for a greenfield deployment.
- [ ] Step 5 verification passed on the `*.vercel.app` URL.
- [ ] Step 6 shows the domain added in Vercel, awaiting DNS.

Lower the TTL on the existing record to the minimum (Auto / 60s) **at least one
TTL period in advance** if you can — it shortens the rollback window.

In the Cloudflare dashboard for the `kunthive.in` zone, in this order:

1. **Workers Routes** (`Workers & Pages → arthaive → Settings → Domains &
   Routes`, or zone-level **Workers Routes**): delete the **Custom Domain**
   entry for `arthaive.kunthive.in`. This also removes the managed DNS record
   Cloudflare created for it; a Worker Custom Domain and a manual CNAME cannot
   coexist on the same hostname.
2. Delete the two OG-image Worker routes:
   ```text
   arthaive.kunthive.in/opengraph-image
   arthaive.kunthive.in/deal/*/opengraph-image
   ```
   These pointed at the `arthaive-og-image` Worker. Leaving them in place would
   intercept those paths *before* the request ever leaves Cloudflare and would
   shadow the new in-app `next/og` handlers. Delete both.
3. **DNS → Records** → confirm no leftover A/AAAA/CNAME record for
   `arthaive`. Delete any that remain.
4. Add the new record:

   | Field | Value |
   | --- | --- |
   | Type | `CNAME` |
   | Name | `arthaive` |
   | Target | `<vercel-dns-target>` |
   | Proxy status | **DNS only (grey cloud)** |
   | TTL | Auto |

5. Do **not** enable the orange cloud.

### TLS implications — read before clicking

- With the proxy **off**, Cloudflare is only answering DNS. TLS is negotiated
  browser → Vercel. Vercel issues and auto-renews the certificate for
  `arthaive.kunthive.in`. The zone's SSL/TLS mode ("Flexible", "Full",
  "Full (strict)") is irrelevant for this hostname because no Cloudflare proxy
  is in the path.
- There is a short window between the DNS change and Vercel completing its
  certificate challenge. During it, browsers may see a certificate error or a
  Vercel holding page. It is typically well under a few minutes. Do not panic
  and revert on the first failed load — check the Domains tab first.
- Do **not** leave the orange cloud on "just to be safe during the switch".
  A proxied hostname with Cloudflare "Flexible" SSL, plus the app's
  `Strict-Transport-Security` header, is how you get a redirect loop; and
  Vercel's certificate challenge fails behind a proxy that terminates TLS
  itself.
- Any Cloudflare Page Rules, Transform Rules, Cache Rules, or Bot Fight Mode
  scoped to `arthaive.kunthive.in` stop applying. Confirm none of them were
  carrying load-bearing behavior — a redirect, a header, a cache bypass.
- Universal SSL certificates Cloudflare holds for the zone remain, harmlessly
  unused for this hostname.

Then, back in Vercel: Settings → **Domains** → wait for `arthaive.kunthive.in`
to flip to **Valid Configuration** with a certificate issued. Refresh; do not
re-add the domain.

## Step 8 — Post-cutover verification

Run this on `https://arthaive.kunthive.in` in a browser with a **cleared cache**
and, for the auth checks, an incognito window.

### Transport

- [ ] `curl -sSI https://arthaive.kunthive.in | head -20` returns 200 and
      carries Vercel response headers (`x-vercel-id`), **not** `cf-ray`.
- [ ] `dig +short arthaive.kunthive.in CNAME` shows the Vercel target.
- [ ] The certificate issuer is Vercel's, not Cloudflare's.
- [ ] `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
      `Referrer-Policy`, `Permissions-Policy`, and
      `Content-Security-Policy-Report-Only` are all present.

### Auth round trip

- [ ] `/login` → **Sign in with Google** → consent → lands back signed in.
- [ ] The session survives a hard refresh.
- [ ] A pre-existing user keeps their data: bookmarks, watchlist, saved
      searches, notes, dashboards all still theirs.
- [ ] Sign out clears the session; private routes then redirect to `/login`.
- [ ] `/admin` is reachable for an `ADMIN_EMAILS` address and returns
      unauthorized for one that is not on the list.
- [ ] Create and delete one bookmark, one watchlist entry, one note, one saved
      search. These exercise the service-role + owner-filter path.

If sign-in fails, check `BETTER_AUTH_URL` first, then the Google redirect URI,
then whether `BETTER_AUTH_SECRET` matches the old deployment's.

### OG cards — test with a real share-preview tool

Do not settle for the image rendering in a browser tab. Crawlers fetch these
differently and the routes just moved runtimes. Run the URL through at least
two of:

- Facebook Sharing Debugger — <https://developers.facebook.com/tools/debug/>
- LinkedIn Post Inspector — <https://www.linkedin.com/post-inspector/>
- X/Twitter card validator, or a Slack/Discord/WhatsApp paste into a private
  channel

Check:

- [ ] `https://arthaive.kunthive.in` previews with the site card.
- [ ] `https://arthaive.kunthive.in/deal/<real-id>` previews with the
      deal-specific card, showing the correct company and amount.
- [ ] The image URL in the `og:image` meta tag is absolute and on
      `arthaive.kunthive.in` — if `NEXT_PUBLIC_APP_URL` is wrong it will point
      somewhere else and crawlers will 404.
- [ ] Use each tool's "scrape again" / "fetch new" button; they cache
      aggressively and may otherwise replay the Worker-era image.

### Image optimization

- [ ] A profile avatar loads via `/_next/image?url=...&w=...&q=...` and
      returns `200` with a modern format (`content-type: image/webp` or
      `image/avif` in a supporting browser).
- [ ] No `400` responses from `/_next/image` in the network panel. A 400 is an
      un-allow-listed host in `images.remotePatterns`.

### ISR and caching

- [ ] A statically generated page returns `x-vercel-cache: HIT` on a second
      request.
- [ ] After its revalidate window, content refreshes without a redeploy.
- [ ] No stale content is being served from a Cloudflare cache — there should
      be no `cf-cache-status` header at all.

### Realtime

- [ ] `/live` opens a WebSocket to `wss://<ref>.supabase.co` and the feed
      updates when a new row lands in `deals`.
- [ ] No CSP violations for the Supabase origins in the browser console. The
      CSP is Report-Only, so a violation will not break anything, but it is a
      signal the policy needs updating before it is ever enforced.

### Public API v1

- [ ] `GET /api/v1/funding-rounds?limit=5` returns rows.
- [ ] `GET /api/v1/startups`, `/api/v1/trends/monthly`,
      `/api/v1/trends/sectors`, `/api/v1/search?q=fintech` all respond.
- [ ] A request with a valid `X-API-Key` gets the higher rate-limit tier.
- [ ] Rate limiting actually engages — hammer an endpoint past the anonymous
      limit and confirm a `429`. If it never triggers, Upstash is not
      configured, and with the WAF gone there is nothing else throttling abuse.

### Observability

- [ ] Sentry shows events tagged to the new production release.
- [ ] Deliberately hit a 500-producing path (or use Sentry's test route) and
      confirm the event arrives with a readable stack trace, which means source
      maps uploaded.
- [ ] Vercel **Runtime Logs** show requests, and **Observability** shows no
      unexpected function errors or timeouts.
- [ ] The two `maxDuration: 60` routes (`/api/chat`, `/api/search/nl`) complete
      a real AI request without a 504.

### Data sanity

- [ ] Deal counts on the home page and `/explore` match what Supabase actually
      holds. A zero here means Supabase is misconfigured — the fixture is
      stubbed and provides no fallback.

## Step 9 — Rollback

Rollback is a **DNS flip back to the still-deployed Workers**. Nothing about
the database changes during this cutover, so there is no data rollback to
perform.

The `arthaive` and `arthaive-og-image` Workers remain deployed and functional
throughout the soak — they are merely off-route. To go back:

1. Cloudflare → DNS → delete the CNAME for `arthaive`.
2. Cloudflare → `Workers & Pages → arthaive → Settings → Domains & Routes` →
   re-add `arthaive.kunthive.in` as a **Custom Domain**. Cloudflare recreates
   the managed DNS record and re-provisions its certificate.
3. Re-add the two OG routes to the `arthaive-og-image` Worker:
   ```text
   arthaive.kunthive.in/opengraph-image
   arthaive.kunthive.in/deal/*/opengraph-image
   ```
4. Confirm the Worker's runtime secrets are still populated — they are, unless
   someone deleted them.
5. Verify sign-in works on the restored deployment.

Expect a few minutes of propagation plus certificate re-provisioning. This is
why the TTL should be low before step 7.

Practical notes:

- Sessions survive a rollback **only if** `BETTER_AUTH_SECRET` is identical on
  both deployments. Another reason not to regenerate it.
- In Vercel, leave the project and the domain in place during a rollback. You
  will want them when you retry.
- If the problem is a bad Vercel deployment rather than the platform itself,
  prefer **Promote to Production** on the previous good Vercel build over a DNS
  rollback — it is an instant alias swap and does not touch DNS.

## Step 10 — Soak

Watch for **at least 7 days**, covering one full weekly cycle including a
scheduled pipeline run:

- [ ] Sentry error rate is at or below the Workers-era baseline.
- [ ] No `relation "user" does not exist`, `permission denied for schema
      better_auth`, or connection-pool errors in the logs. Any of these points
      at the pooler mode — confirm `DATABASE_URL` is still the session pooler
      on 5432 (step 4).
- [ ] Supabase → Database → connection count stays flat and does not climb
      with traffic. A steady climb means the pool `max` is not 1 somewhere, or
      connections are not being released.
- [ ] Google OAuth callback failures are near zero.
- [ ] The scheduled pipeline (`.github/workflows/pipeline.yml`) ran and wrote
      to Supabase, and new deals appear on the live site.
- [ ] Core Web Vitals in Vercel Speed Insights are no worse than before.
- [ ] Vercel function invocation counts and bandwidth are within the plan's
      limits — this is new metered surface that Workers billed differently.
- [ ] Nobody reports missing OG cards on links shared during the window.

## Step 11 — Deferred manual cleanup (after soak only)

**Do not do this during cutover.** It is what makes rollback cheap. Only once
the soak is clean and you have accepted that rollback is no longer needed:

1. Cloudflare → `Workers & Pages` → delete the **`arthaive`** Worker.
2. Cloudflare → `Workers & Pages` → delete the **`arthaive-og-image`** Worker.
3. Remove any remaining Cloudflare API tokens issued for Worker deploys —
   Account → API Tokens. Also delete `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` from GitHub repository secrets if they are still
   there; CI no longer uses them.
4. Remove `http://localhost:8787/api/auth/callback/google` from the Google
   OAuth client if it was not removed in step 3.
5. Revoke the Worker-era `BETTER_AUTH_SECRET` only if you intend a deliberate
   secret rotation — that signs everyone out, so treat it as its own change,
   not as cleanup.

Deleting a Worker is not reversible into the same routes and secrets. Once step
11 is done, the rollback path in step 9 no longer exists and recovery means
redeploying from Git history.

## Quick reference — what moved where

| Concern | Before (Cloudflare Workers) | After (Vercel) |
| --- | --- | --- |
| Runtime | `workerd` via OpenNext adapter | Vercel Node.js serverless functions |
| Build | `npm run build:cloudflare` | `npm run build` |
| Deploy | `wrangler deploy` / Workers Builds | Vercel Git integration |
| Config | `wrangler.jsonc`, `open-next.config.ts` | `vercel.json` |
| Secrets | `wrangler secret put` + Workers Builds vars | Vercel env vars, per scope |
| Local preview | `npm run preview` (`.dev.vars`) | `npm run dev` (`.env.local`) |
| TLS | Cloudflare Universal SSL | Vercel-managed certificate |
| CDN / cache | Cloudflare edge | Vercel edge network |
| Static headers | `public/_headers` | Vercel defaults + `next.config.mjs` |
| Image optimization | Disabled (no optimizer in `workerd`) | Enabled, `remotePatterns` allow-list |
| OG images | Standalone `arthaive-og-image` Worker | In-app `next/og` route handlers |
| DB connection | Direct Supabase, pool `max: 5` | Supavisor **session** pooler :5432, pool `max: 1`, no `sslmode` in URL |
| WAF / bot mgmt | Cloudflare, on the proxied hostname | None — app-level rate limiting only |

## Related documents

- [`DEPLOYMENT.md`](DEPLOYMENT.md) — steady-state hosting reference.
- [`EXISTING_SUPABASE_VERCEL_MIGRATION.md`](EXISTING_SUPABASE_VERCEL_MIGRATION.md)
  — the Supabase Auth → Better Auth database migration. A **different**
  migration; if it has not been completed, do that one first.
- [`SECURITY.md`](SECURITY.md) — production stack and threat surface.
- `.env.example` — canonical variable list.
