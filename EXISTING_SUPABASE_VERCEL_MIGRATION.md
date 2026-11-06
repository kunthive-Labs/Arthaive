# Existing Supabase Project Migration Runbook

This document explains how to move an existing Arthaive installation from the previous Supabase Auth deployment to the current stack:

- Next.js deployed on Vercel
- Better Auth for application identity and sessions
- Google OAuth as the sign-in provider
- The existing Supabase project retained for PostgreSQL, Realtime, Storage, and the Data API
- Better Auth tables stored in a private `better_auth` PostgreSQL schema

This is an operational migration guide for an existing Supabase project. It is not a fresh-install guide.

This document covers the **database and identity** migration. Moving the application's *hosting* from Cloudflare Workers to Vercel is a separate, independent change with its own ordered checklist in [`VERCEL_CUTOVER_RUNBOOK.md`](VERCEL_CUTOVER_RUNBOOK.md). Do not interleave them: complete one, verify it, then start the other. Everything below assumes Vercel is the hosting target, because that is the stack the repository now builds for.

## Read this before changing production

The Git repository and the Supabase database are separate systems. Merging code into `main` does not migrate the database, and changing the database affects every deployment that uses that Supabase project.

Migration `023_cutover_to_better_auth.sql` is the production cutover. It changes the `profiles` foreign key, replaces the profile synchronization trigger, and removes the old Supabase-JWT-dependent private RLS policies. After it runs, the previous Supabase Auth version of the application should not continue serving private user features.

Do not run migration `023` until all of the following are true:

- A current Supabase backup exists.
- The Vercel production build is known to succeed.
- The Vercel Production-scope environment variables are configured.
- `npm run check-db -- --strict` passes against the production `DATABASE_URL`.
- The Google OAuth production callback is configured.
- A deployable Vercel build is ready to promote.
- You are prepared for existing users to sign in again.

For the lowest-risk rehearsal, clone the database into a separate Supabase project and complete this runbook there first.

## What remains in Supabase

This migration does not replace Supabase itself. The existing project continues to provide:

- The `public` application schema and all existing application data
- Storage buckets and objects
- Realtime
- The Supabase Data API
- Database backups

Supabase Auth is no longer used by the application after cutover. The old `auth.users` rows are read during migration so existing UUIDs can be preserved, but Better Auth becomes the owner of application identity and sessions.

Do not delete the old `auth.users` data immediately. Retain it during the stabilization period because it is useful for verification and database rollback.

## What changes on top of the existing project

The repository adds two migrations after the previous schema:

1. `supabase/migrations/022_better_auth_schema.sql`
2. `supabase/migrations/023_cutover_to_better_auth.sql`

Migration `022`:

- Creates the private `better_auth` schema.
- Creates `better_auth.user`.
- Creates `better_auth.session`.
- Creates `better_auth.account`.
- Creates `better_auth.verification`.
- Adds the indexes Better Auth needs.

Migration `023`:

- Copies email-bearing users from `auth.users` into `better_auth.user`.
- Preserves the existing Supabase user UUIDs.
- Uses existing profile names and avatars where available.
- Removes the previous `auth.users` profile trigger.
- Changes `public.profiles.id` to reference `better_auth.user.id`.
- Adds a trigger that synchronizes Better Auth users into `public.profiles`.
- Removes the old private RLS policies that relied on `auth.uid()`.
- Adds `public.api_keys.user_id` and backfills it from profile email matches.

The application now validates the Better Auth session on the server, then accesses private Supabase data with the elevated server key and an explicit authenticated `user_id` filter. The elevated key must never be exposed to the browser.

## Authentication behavior after migration

The current application enables Google OAuth only.

- Supabase Auth sessions do not migrate.
- Existing users must sign in again.
- Supabase provider tokens and identities are not copied.
- When an existing user signs in with Google using the same verified email, Better Auth links the Google account to the migrated Better Auth user.
- Because the migrated Better Auth user retains the old UUID, bookmarks, dashboards, notes, watchlists, alerts, and other user-owned records keep their existing owner IDs.
- Users who previously signed in only by password, phone, or a non-Google provider will not be able to sign in unless they have a Google account with the same email or another provider is implemented.

The account-linking behavior is configured in `lib/auth.ts`. Different-email account linking is disabled.

Better Auth does not require a hosted Better Auth account, subscription, or API key. It runs inside the application.

## Phase 1: Prepare and back up the existing Supabase project

### 1. Confirm that this is the correct project

In the Supabase dashboard, record:

- Project name
- Project reference
- Region
- Production URL
- Current database version
- The application environments that currently use the project

Do not proceed if a staging deployment and production deployment unexpectedly share the same project.

### 2. Create a backup

For paid projects, open:

`Supabase Dashboard -> Database -> Backups`

Confirm that a recent backup or Point-in-Time Recovery point exists.

For an additional logical backup, use the Supabase CLI or `pg_dump` with the direct database connection. Supabase documents the available backup methods at:

<https://supabase.com/docs/guides/platform/backups>

Storage file contents are not part of a PostgreSQL database backup. Database backups contain Storage metadata, not deleted object contents.

### 3. Record the current authentication configuration

Before changing Google OAuth, record the existing Supabase callback URI and OAuth client configuration. Keep the old Supabase callback registered during the stabilization period so a database-and-code rollback remains possible.

Do not disable Supabase Auth or delete its users before the new login flow has been verified.

## Phase 2: Run database preflight checks

Open `Supabase Dashboard -> SQL Editor -> New query` and run each check.

### Confirm the expected application tables exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'watchlist',
    'bookmarks',
    'saved_searches',
    'alerts',
    'dashboards',
    'deal_notes',
    'api_keys'
  )
order by table_name;
```

Investigate any missing table before running the cutover migration. An existing Arthaive project should already have the earlier migrations through `021_performance_indexes.sql`.

### Find Supabase Auth users without email addresses

```sql
select id, phone, created_at
from auth.users
where email is null;
```

Migration `023` does not migrate users without an email address. Decide how those users will be handled before cutover.

### Find profiles without a matching Supabase Auth user

```sql
select p.id, p.email
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;
```

This query should return zero rows. Orphan profiles can prevent the new foreign key from being created.

### Find profiles whose users cannot be migrated

```sql
select p.id, p.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email is null;
```

This query should return zero rows before the foreign key is moved to `better_auth.user`.

### Check normalized profile email uniqueness

```sql
select lower(email) as normalized_email, count(*)
from public.profiles
where email is not null
group by lower(email)
having count(*) > 1;
```

Resolve duplicates before relying on email to backfill API key ownership.

### Inspect current RLS policies

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'watchlist',
    'bookmarks',
    'saved_searches',
    'alerts',
    'dashboards',
    'deal_notes'
  )
order by tablename, policyname;
```

Migration `023` removes the policy names created by the repository's previous migrations. If production has additional custom policies based on `auth.uid()`, audit them separately. Better Auth cookies are not Supabase JWTs, so `auth.uid()` will not contain the Better Auth user ID.

### Compare authentication and profile counts

```sql
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from auth.users where email is not null) as migratable_users,
  (select count(*) from public.profiles) as profiles;
```

Save the result for post-migration comparison.

## Phase 3: Apply migration 022

Migration `022` only adds the Better Auth schema and tables. It can be applied before the final cutover.

1. Open `supabase/migrations/022_better_auth_schema.sql` from the repository.
2. Copy the entire file.
3. Open a new Supabase SQL Editor query.
4. Run the migration.

Verify the tables:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'better_auth'
order by table_name;
```

Expected result:

- `account`
- `session`
- `user`
- `verification`

Verify the connection search path after the application database connection is configured:

```sql
show search_path;
```

The application passes `-c search_path=better_auth` when it creates the Better Auth PostgreSQL pool. Better Auth application queries must resolve their unqualified table names inside this schema.

Do not run `npx auth migrate` against production after applying the repository migration unless a future Better Auth upgrade explicitly includes a reviewed schema migration. The checked-in SQL is the source of truth for this release.

## Phase 4: Collect the required Supabase values

### Project URL

Open:

`Supabase Dashboard -> Project Settings -> API`

Copy the project URL, for example:

```text
https://abcdefghijk.supabase.co
```

Use it for:

```text
NEXT_PUBLIC_SUPABASE_URL
```

### Browser-safe Supabase key

From the same API Keys screen, copy either:

- The current publishable key beginning with `sb_publishable_`, or
- The legacy `anon` key.

Use it for:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The environment variable retains its historical name even when a newer publishable key is used.

### Elevated server Supabase key

From `Project Settings -> API Keys`, copy either:

- A current secret key beginning with `sb_secret_`, or
- The legacy `service_role` key.

Use it for:

```text
SUPABASE_SERVICE_ROLE_KEY
```

This key bypasses Row Level Security. Store it only as a Sensitive Vercel environment variable and a local server-side secret. Never prefix it with `NEXT_PUBLIC_`, place it in browser code, paste it into an issue, or commit it.

Supabase explains publishable, secret, `anon`, and `service_role` keys here:

<https://supabase.com/docs/guides/getting-started/api-keys>

### PostgreSQL connection URL for Better Auth

Click `Connect` at the top of the Supabase project dashboard.

**On Vercel you must use the Supavisor pooler. A direct connection is not an option.** Two independent constraints force this:

1. **IPv6.** The direct database address (`db.PROJECT_REF.supabase.co`) resolves to IPv6 only, unless the paid Supabase IPv4 add-on is enabled. Vercel's serverless functions have no IPv6 egress, so a direct connection cannot be established at all — it does not fail slowly or degrade, it simply never connects. The Supavisor pooler is reachable over IPv4.
2. **Connection count.** Each concurrently-executing serverless instance holds its own driver pool. Even a small per-instance pool multiplied by concurrency exhausts the Postgres connection limit. `lib/auth.ts` therefore sets the pool `max` to **1** and lets Supavisor do the real multiplexing. This is a change from the previous Worker deployment, which used a larger per-isolate pool.

### Use the SESSION pooler on port 5432

This has been verified live against the project, not inferred.

| Mode | Port | Behavior |
| --- | --- | --- |
| **Session** | **`5432`** | A dedicated backend is held for the connection's lifetime. Session state and connection **startup options** are preserved, so `search_path` behaves exactly as on a direct connection. **Use this.** |
| Transaction | `6543` | Backends are reassigned between transactions. Higher concurrency, but session state — including a pinned `search_path` — can be lost. |

The choice is load-bearing for Arthaive. `lib/auth.ts` opens the pool with a connection-level startup option:

```text
options: "-c search_path=better_auth"
```

Better Auth's tables live in the non-default `better_auth` schema and are addressed unqualified. If the pooling mode does not carry that state through, every Better Auth query fails with `relation "user" does not exist`.

Port `6543` *does* connect, and a single-client test against it passes. **That pass is meaningless**: with one client and zero contention every statement reaches the same backend. Under real concurrency the reassignment happens and the pinned `search_path` disappears. `lib/auth.ts` warns at startup when it sees port 6543, and re-verifies the effective `search_path` on every physical connection so the failure is loud instead of silent.

### The connection string

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

For this project the pooler host is `aws-1-ap-south-1.pooler.supabase.com`. Note **`aws-1`**, not `aws-0`: the `aws-0-…` host exists but returns `Tenant or user not found` for this project. Copy the host from the dashboard rather than assuming the numbering. The `ap-south-1` (Mumbai) region is also what makes `regions: ["bom1"]` in `vercel.json` the correct co-location.

Measured DNS for this project, which is the concrete form of the IPv6 constraint:

| Host | Records |
| --- | --- |
| `db.PROJECT_REF.supabase.co` (direct) | AAAA only — **no A record** |
| `aws-1-ap-south-1.pooler.supabase.com` | 3 × A, no AAAA |

Important details:

- The username is `postgres.PROJECT_REF`, **not** `postgres`. Keep the project-ref suffix exactly as Supabase prints it.
- Percent-encode reserved characters in the password.
- Do not use the Supabase project URL or REST API key as `DATABASE_URL`.

### Do not append `?sslmode=require`

**Leave `sslmode` off the URL entirely.** Earlier revisions of this runbook told you to add `?sslmode=require`. That advice was wrong and would break every connection:

- `pg` >= 8.11 parses `sslmode=require|prefer|verify-ca` as **verify-full**, and a value present in the URL overrides any `ssl` option passed to the `Pool`.
- Supabase serves a certificate chained to its own private *Supabase Root 2021 CA*, which is not in Node's trust store.
- The handshake fails with `SELF_SIGNED_CERT_IN_CHAIN` (openssl verify return code 19).

Omitting the parameter does **not** mean plaintext here. `lib/auth.ts` strips `sslmode`, `uselibpqcompat`, and `sslrootcert` for Supabase hosts and configures TLS in the driver, so traffic is always encrypted. (A URL with no `sslmode` handed to a bare `pg` client *would* connect in plaintext — which is precisely why the driver config owns TLS rather than the URL.)

The default is encrypted-but-unverified, equivalent to `sslmode=no-verify` and matching Supabase's own guidance. To get real certificate verification, download the CA from `Project Settings -> Database -> SSL configuration` and paste the PEM into the optional `DATABASE_SSL_CA` variable; `lib/auth.ts` then sets `rejectUnauthorized: true`.

### Verify the candidate URL before using it

```bash
npm run check-db              # reads .env.local
npm run check-db -- --strict  # hard-fail on anything Vercel cannot use
```

Or against a specific string:

```bash
DATABASE_URL='postgresql://...' node scripts/check-db.mjs --strict
```

The preflight resolves DNS, checks IPv4 reachability, negotiates TLS, and asserts that the `better_auth` schema exists, is usable by the role, contains all four tables, and is actually pinned onto the connection's `search_path`. Under `--strict`, a direct IPv6-only host, the transaction pooler, or an unhonoured `search_path` are hard failures.

Supabase connection modes are documented here:

<https://supabase.com/docs/guides/database/connecting-to-postgres>

## Phase 5: Create the Better Auth secret

Generate a high-entropy secret locally:

```bash
openssl rand -base64 32
```

Store the result as:

```text
BETTER_AUTH_SECRET
```

This secret is created by you. There is no Better Auth dashboard from which to fetch it.

Keep the same production secret across deployments. Replacing it without a planned secret rollover invalidates authentication state. Better Auth documents the secret and base URL configuration here:

<https://better-auth.com/docs/installation>

## Phase 6: Choose the canonical application URL

Decide which HTTPS origin users will visit before configuring Google OAuth.

For this deployment the canonical production origin is the custom domain:

```text
https://arthaive.kunthive.in
```

The Vercel-assigned alias is the fallback if no custom domain is attached yet:

```text
https://VERCEL_PROJECT.vercel.app
```

`VERCEL_PROJECT` is an operator-supplied value — read the exact subdomain off the project's Domains tab rather than guessing it from the repository name.

Use the origin only, with no `/api/auth` suffix:

```text
BETTER_AUTH_URL=https://arthaive.example.com
NEXT_PUBLIC_BASE_URL=https://arthaive.example.com
NEXT_PUBLIC_APP_URL=https://arthaive.example.com
```

Use HTTPS in production. Keep the values identical unless there is an intentional reason to publish a different canonical site URL.

Changing the production domain later requires updating both the Vercel environment variables and the Google OAuth callback — and, because `NEXT_PUBLIC_*` values are inlined at build time, redeploying afterwards.

Set the Preview scope's three origin variables to the project's stable `https://VERCEL_PROJECT.vercel.app` alias, not to a per-commit deployment URL. Per-commit URLs change on every push and cannot be registered as Google redirect URIs.

## Phase 7: Configure Google OAuth

### Reuse or create an OAuth client

If the previous Supabase Auth application already uses Google, the same Google OAuth web client can be reused. Add the Better Auth callback while retaining the old Supabase callback during the rollback window.

Otherwise:

1. Open <https://console.cloud.google.com/>.
2. Select or create the Google Cloud project for Arthaive.
3. Open `Google Auth Platform`.
4. Configure Branding, application name, support email, and developer contact.
5. Choose the appropriate audience.
6. If the application is in Testing mode, add the required test users.
7. Open `Clients` or `APIs & Services -> Credentials`.
8. Create an OAuth client.
9. Select `Web application`.

### Add redirect URIs

Add the production callback exactly:

```text
https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google
```

For this deployment that is:

```text
https://arthaive.kunthive.in/api/auth/callback/google
```

For Vercel preview deployments, add the project's stable alias:

```text
https://VERCEL_PROJECT.vercel.app/api/auth/callback/google
```

For local Next.js development, add:

```text
http://localhost:3000/api/auth/callback/google
```

There is no longer a local Worker preview runtime, so `http://localhost:8787/api/auth/callback/google` is obsolete. Remove it from the client if it is still registered.

The scheme, hostname, port, path, case, and trailing slash behavior must match. Google returns `redirect_uri_mismatch` when they differ.

Per-commit preview URLs of the form `PROJECT-HASH-TEAM.vercel.app` cannot be enumerated in the allowlist. Sign-in will fail on those, by design. Test authentication on the stable alias or in production.

Google's web-server OAuth documentation is available here:

<https://developers.google.com/identity/protocols/oauth2/web-server>

### Copy the credentials

Copy the OAuth web client values into:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Do not commit the client secret or upload Google's downloaded credential JSON to the repository.

## Phase 8: Configure administrator access

Set `ADMIN_EMAILS` to a comma-separated list of Google account email addresses allowed to access `/admin`:

```text
ADMIN_EMAILS=owner@example.com,operator@example.com
```

Matching is case-insensitive and whitespace is trimmed. An empty value means no user receives administrator access.

## Complete environment-variable inventory

### Required production variables

| Variable | Secret? | Where it comes from | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase Dashboard -> Connect -> **Session pooler** (port 5432, no `sslmode` suffix) | Better Auth PostgreSQL connection |
| `BETTER_AUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` | Better Auth encryption and signing secret |
| `BETTER_AUTH_URL` | No | Your canonical production origin | OAuth callbacks and auth URLs |
| `GOOGLE_CLIENT_ID` | Usually no | Google Cloud OAuth web client | Google provider identifier |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud OAuth web client | Google provider secret |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase Project Settings -> API | Supabase project/Data API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase API Keys -> publishable or legacy anon key | Browser-safe Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase API Keys -> secret or legacy service-role key | Server-only privileged data access |
| `ADMIN_EMAILS` | Treat as sensitive configuration | Your administrator allowlist | Protects `/admin` and admin APIs |
| `NEXT_PUBLIC_BASE_URL` | No | Your canonical production origin | Absolute links and auth fallback URL |
| `NEXT_PUBLIC_APP_URL` | No | Your canonical production origin | Metadata, sitemap, sharing, and structured data |
| `NEXT_PUBLIC_APP_VERSION` | No | Release/version policy, for example `0.1.0` | Display and build metadata |

### Feature-dependent variables

| Variable | Secret? | Where it comes from | Behavior when absent |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Console | Anthropic-backed summaries, NL search, and classification degrade gracefully |
| `AI_MONTHLY_BUDGET_USD` | No | Your spending policy | Defaults to USD 50 |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Console | Distributed cache and rate limiting fall back or are disabled |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Console | Must be set with the Upstash URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Public identifier | Sentry project settings | Browser monitoring is disabled |
| `SENTRY_DSN` | Treat as sensitive configuration | Sentry project settings | Server monitoring is disabled |
| `SENTRY_ORG` | No | Sentry organization slug | Needed for source-map upload configuration |
| `SENTRY_PROJECT` | No | Sentry project slug | Needed for source-map upload configuration |
| `SENTRY_AUTH_TOKEN` | Yes; build only | Sentry auth tokens | Source maps are not uploaded |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | Your observability policy | Client SDK default applies |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Your observability policy | Server SDK default applies |

In Vercel, mark `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` as **Sensitive** so their values cannot be read back from the dashboard or API.

Do not manually set `NODE_ENV`, `NEXT_RUNTIME`, `VERCEL_ENV`, or `VERCEL_URL`. Vercel populates them; overriding them breaks framework behavior.

`NEXTJS_ENV`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` are no longer used anywhere. They were Worker/OpenNext-era values. Remove them from any environment where they linger.

Note that `NEXT_PUBLIC_*` values are inlined into the browser bundle by `next build` and are **not** read at request time. A variable must therefore exist in the environment scope the build runs in, and changing one requires a redeploy before the new value reaches users.

## Recommended production environment template

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_REPLACE_ME
SUPABASE_SERVICE_ROLE_KEY=sb_secret_REPLACE_ME

# Better Auth database and application identity
# Supavisor SESSION pooler, port 5432. No ?sslmode= suffix — see Phase 4.
DATABASE_URL=postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
# Optional: PEM of Supabase's root CA to enable certificate verification.
DATABASE_SSL_CA=
BETTER_AUTH_SECRET=GENERATE_A_HIGH_ENTROPY_SECRET
BETTER_AUTH_URL=https://YOUR_DOMAIN

# Google OAuth
GOOGLE_CLIENT_ID=REPLACE_ME.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=REPLACE_ME

# Application
ADMIN_EMAILS=owner@example.com
NEXT_PUBLIC_BASE_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_APP_VERSION=0.1.0

# Optional AI
ANTHROPIC_API_KEY=
AI_MONTHLY_BUDGET_USD=50

# Optional Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
SENTRY_TRACES_SAMPLE_RATE=
```

Never commit a populated copy of this block.

## Phase 9: Configure the Vercel project

Open the Arthaive project in Vercel, or create it with **Add New… → Project** and import the repository.

### Build configuration

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Production branch | `main` |
| Root directory | Repository root — not `landing/` |
| Node.js version | 22.x |
| Install command | `npm install` (from `vercel.json`) |
| Build command | `npm run build` (from `vercel.json`) |
| Output directory | Framework default |

`vercel.json` is the checked-in source of truth for platform settings and already declares the framework, install/build/dev commands, `regions: ["bom1"]`, `cleanUrls`, and a 60-second `maxDuration` for the two Anthropic-backed routes (`app/api/chat/route.ts` and `app/api/search/nl/route.ts`). Prefer editing that file over overriding values in the dashboard, so the configuration stays in version control.

The `prebuild` hook regenerates `data/funding-data.ts` before `next build`. There is no OpenNext step, no Wrangler step, and no separate deploy command.

Vercel build configuration is documented here:

<https://vercel.com/docs/deployments/configure-a-build>

### Environment variables and their scopes

Vercel has three environment scopes — **Production**, **Preview**, and **Development** — and one variable can be assigned to any combination of them. Unlike the previous deployment there is **no separate "build environment" versus "runtime environment"**: a variable ticked for a scope is present both while `next build` runs and while the functions execute. That removes a whole class of "works at runtime, missing at build" errors.

Set them under `Project -> Settings -> Environment Variables`.

Assign these to **Production**, using the real Supabase project, the real Google OAuth client, and `https://arthaive.kunthive.in` as the canonical origin:

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

Mark these **Sensitive** so the values cannot be read back:

```text
DATABASE_URL
BETTER_AUTH_SECRET
GOOGLE_CLIENT_SECRET
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN
SENTRY_AUTH_TOKEN
```

Assign the same variable names to **Preview**, but point the three origin variables at the project's stable alias so OAuth callbacks resolve to a URL you can register with Google:

```text
BETTER_AUTH_URL=https://VERCEL_PROJECT.vercel.app
NEXT_PUBLIC_BASE_URL=https://VERCEL_PROJECT.vercel.app
NEXT_PUBLIC_APP_URL=https://VERCEL_PROJECT.vercel.app
```

Prefer staging Supabase credentials and a staging `BETTER_AUTH_SECRET` in Preview. If Preview points at the production Supabase project, every preview branch writes to real user data.

Add the optional Upstash, Anthropic, and Sentry values only when those features are in use. Each degrades gracefully when absent — but note that with no Upstash configured the public API v1 has **no rate limiting at all**.

Vercel documents environment variables here:

<https://vercel.com/docs/environment-variables>

### The `NEXT_PUBLIC_*` build-time caveat

`NEXT_PUBLIC_*` values are inlined into the JavaScript bundle by `next build`. They are not read at request time. Two consequences that reliably catch people out:

- A variable ticked only for **Production** is **absent from Preview builds**. Tick every scope the app needs it in.
- **Editing a `NEXT_PUBLIC_*` value does not take effect until you redeploy.** The old value stays baked into the shipped bundle. Use `Deployments -> ... -> Redeploy`.

Never prefix a secret with `NEXT_PUBLIC_`. Anything so prefixed is published to every browser.

### Deployment authentication values

Vercel's native Git integration requires **no API tokens in the repository**. Authorizing the Vercel GitHub App on the repository is the entire credential setup, and deploys are triggered by pushes.

There is consequently no deploy job in GitHub Actions and no `VERCEL_TOKEN` secret to manage. `.github/workflows/ci.yml` runs lint, typecheck, tests, and `npm run build` as a correctness gate only; Vercel builds independently of it.

The previous `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are no longer used by any workflow. Delete them once the Cloudflare Workers are retired.

## Phase 10: Configure the domain and DNS

The application keeps its existing hostname, `arthaive.kunthive.in`. What changes is which platform answers for it.

Cloudflare remains the DNS and TLS edge for the `kunthive.in` zone, but for this hostname it becomes **DNS-only**: a CNAME to Vercel with the proxy **off (grey cloud)**. Vercel terminates TLS and owns the CDN.

1. In Vercel, open `Project -> Settings -> Domains` and add `arthaive.kunthive.in`. Vercel displays the exact CNAME target to use; copy it from the dashboard rather than reusing a value remembered from another project. The domain stays **Invalid Configuration** until DNS points at it.
2. In the Cloudflare `kunthive.in` zone, remove the old Worker bindings for the hostname:
   - Delete the **Custom Domain** entry for `arthaive.kunthive.in` on the `arthaive` Worker. This also removes the managed DNS record Cloudflare created for it. A Worker Custom Domain and a manual CNAME cannot coexist on one hostname.
   - Delete the two Worker routes that served OG images, `arthaive.kunthive.in/opengraph-image` and `arthaive.kunthive.in/deal/*/opengraph-image`. Left in place they intercept those paths at the Cloudflare edge and shadow the in-app `next/og` handlers.
3. In `DNS -> Records`, confirm no leftover A/AAAA/CNAME record exists for `arthaive`, then add a `CNAME` for `arthaive` pointing at the Vercel target, with **Proxy status: DNS only (grey cloud)** and TTL Auto.
4. Wait for Vercel's Domains tab to report **Valid Configuration** with a certificate issued. Refresh the page; do not re-add the domain.
5. Confirm the live origin is exactly `https://arthaive.kunthive.in`, and that `BETTER_AUTH_URL`, `NEXT_PUBLIC_BASE_URL`, and `NEXT_PUBLIC_APP_URL` all match it.
6. Confirm the Google OAuth client lists `https://arthaive.kunthive.in/api/auth/callback/google`. Because the domain is preserved, this URI is unchanged from the Worker deployment.

TLS notes:

- With the proxy off, TLS is negotiated browser → Vercel and Vercel auto-renews the certificate. The zone's SSL/TLS mode ("Flexible", "Full", "Full (strict)") is irrelevant for this hostname, because no Cloudflare proxy sits in the path.
- Do not enable the orange cloud "just during the switch". Vercel's certificate challenge fails behind a proxy that terminates TLS itself, and a proxied hostname on "Flexible" SSL combined with the app's `Strict-Transport-Security` header produces a redirect loop.
- Accepted trade-off: no Cloudflare WAF, bot management, or edge rate limiting on this hostname. Protection is the application's own Upstash-backed limiter plus the security headers in `next.config.mjs`. Re-enabling the proxy later is a possible follow-up, out of scope here.
- Any Page Rules, Transform Rules, or Cache Rules scoped to `arthaive.kunthive.in` stop applying. Confirm none of them carried load-bearing behavior.

Do not mix a `*.vercel.app` `BETTER_AUTH_URL` with a custom-domain Google callback, or vice versa.

The full ordered hosting cutover, including rollback, is in [`VERCEL_CUTOVER_RUNBOOK.md`](VERCEL_CUTOVER_RUNBOOK.md).

## Phase 11: Validate locally before production cutover

### Standard Next.js development

Create an ignored local file:

```bash
cp .env.example .env.local
```

Fill it with staging or production-like values. Prefer staging credentials for routine development.

Install and validate:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run dev
```

Open:

```text
http://localhost:3000/login
```

Test Google sign-in, sign-out, `/dashboard`, bookmarks, watchlist, notes, saved searches, profile updates, and administrator access.

### Verify the database connection

Before trusting any deployment, confirm the `DATABASE_URL` you intend to ship actually reaches the right schema through the pooler:

```bash
npm run check-db -- --strict
```

The preflight must confirm the connection succeeds, the `better_auth` schema and its four tables exist, and `show search_path` resolves to `better_auth`. A failure here is the single most likely cause of a broken production sign-in, and it costs nothing to catch now. See Phase 4 for how the Supavisor mode is chosen.

There is no separate local Worker runtime any more. `npm run dev` is the only local server, and it is the same Next.js server Vercel builds — so what passes locally is representative. The former `npm run preview` / `.dev.vars` / `localhost:8787` path is gone along with the OpenNext adapter.

### Validate the deployment artifact

```bash
npm run build
```

Expected result:

- The `prebuild` hook regenerates `data/funding-data.ts`.
- The Next.js production build completes with no type or lint errors.
- No OpenNext, Wrangler, or `workerd` step runs.

Warnings about missing Better Auth or Google values mean those values are absent from the shell environment. On Vercel, a variable assigned to a scope is present for both the build and the runtime, so the equivalent check there is simply that the variable is ticked for the scope being built.

Also run the full gate that CI runs:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
```

## Phase 12: Prepare a deployable Vercel build

Before changing the live database, get a known-good build onto Vercel.

1. Push the branch. Vercel creates a **Preview** deployment automatically.
2. Confirm the build succeeds and the preview renders. Because `data/funding-data.ts` is stubbed to an empty array, a preview that renders zero deals means Supabase is misconfigured for that scope — the fixture no longer masks it.
3. Keep the current Production deployment untouched and available. Vercel retains previous production builds, and **Promote to Production** on an earlier build is an instant, atomic alias swap that does not rebuild. That is the application-level rollback and it stays available throughout.

Point the Preview deployment at a **cloned or staging Supabase project** for a full rehearsal. Do not run migration `023` early against production Supabase in order to test a preview: `023` is one-way, and a preview build is not worth spending it on.

## Phase 13: Execute the production cutover

Use a short maintenance window. The old application and the post-`023` database are not intended to operate together.

### Final sequence

1. Confirm the latest Supabase backup or recovery point.
2. Confirm migration `022` has completed.
3. Rerun the preflight SQL checks.
4. Confirm the Vercel Production-scope environment variables are populated, including every `NEXT_PUBLIC_*` value.
5. Confirm `npm run check-db -- --strict` passes against the production `DATABASE_URL`.
6. Confirm the Google production callback.
7. Confirm a successful Vercel build exists and is ready to promote.
8. Pause or discourage private writes in the old application.
9. Run migration `023`.
10. Immediately deploy or promote the new Vercel build.
11. Run the post-cutover verification below.

### Apply migration 023

Open `supabase/migrations/023_cutover_to_better_auth.sql` and run the complete file in the Supabase SQL Editor.

For an explicit transaction in a controlled SQL client, use:

```sql
begin;

-- Paste the complete contents of 023_cutover_to_better_auth.sql here.

commit;
```

Do not rerun migration `023` blindly after a partial error. It creates a named trigger and performs data/constraint changes. Inspect which statements committed, restore from backup if necessary, or prepare a reviewed repair migration.

### Deploy the application

Merging to `main` triggers a Production deployment through Vercel's Git integration. Because that path also runs a fresh build, the fastest and most predictable cutover is to have the build already done:

- Preferred: promote an existing, verified build. `Deployments -> select the build -> Promote to Production`. This is an alias switch and takes effect immediately, with no build latency inside the maintenance window.
- Alternative: merge to `main` and wait for the build. Budget for the build duration and keep the window open until the deployment reports Ready.

Because Vercel deploys automatically from `main`, coordinate the merge with the migration so the pre-`023` code spends as little time as possible against the post-`023` database authorization model. If several people can push to `main`, consider pausing the Git integration (`Settings -> Git -> Ignored Build Step`, or simply freezing merges) for the duration of the window.

If the *hosting* migration from Cloudflare Workers has not happened yet, do it as a separate exercise using [`VERCEL_CUTOVER_RUNBOOK.md`](VERCEL_CUTOVER_RUNBOOK.md). Do not combine a DNS cutover with migration `023` in one window — you will not be able to tell which change broke what.

## Phase 14: Verify the production migration

### Verify user-count parity

```sql
select
  (select count(*) from auth.users where email is not null) as expected_users,
  (select count(*) from better_auth."user") as migrated_users;
```

The counts should match unless users were intentionally excluded or an email conflict was resolved manually.

### Verify preserved user IDs

```sql
select u.email, u.id as old_supabase_id, b.id as better_auth_id
from auth.users u
join better_auth."user" b on lower(b.email) = lower(u.email)
where u.email is not null
  and u.id <> b.id;
```

Expected result: zero rows.

### Verify profile foreign key

```sql
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and contype = 'f';
```

`profiles_id_fkey` should reference `better_auth.user(id)`.

### Verify the profile synchronization trigger

```sql
select trigger_name, event_manipulation
from information_schema.triggers
where event_object_schema = 'better_auth'
  and event_object_table = 'user';
```

Expected trigger:

```text
on_better_auth_user_created
```

### Verify sign-in creates an account and session

After signing in through Google:

```sql
select
  u.id,
  u.email,
  a."providerId",
  a."accountId",
  s."expiresAt"
from better_auth."user" u
left join better_auth."account" a on a."userId" = u.id
left join better_auth."session" s on s."userId" = u.id
where lower(u.email) = lower('YOUR_TEST_EMAIL');
```

Expected:

- The user retains the old UUID.
- `providerId` is `google`.
- An account row exists.
- A non-expired session row exists.

### Verify API key ownership backfill

```sql
select count(*) as api_keys_without_user
from public.api_keys
where user_id is null;
```

Investigate remaining rows. They may use an email that does not match a unique profile.

### Verify application behavior

Test all of the following with a normal migrated user:

- Google sign-in
- Sign-out
- Session persistence after a refresh
- Dashboard access
- Bookmark create/delete
- Watchlist create/delete
- Saved-search create/delete
- Notes create/update/delete
- Profile read/update
- API key management

Test with an administrator:

- `/admin`
- Admin API operations
- Import/export if used

Test while signed out:

- Public pages remain available.
- Private routes redirect to `/login` or return an unauthorized response.
- Private API endpoints do not return another user's data.

### Verify RLS exposure

The browser-safe Supabase key must not gain direct access to private user tables merely because old policies were removed. Confirm that direct anonymous requests cannot read or mutate private rows.

The application server uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. Security therefore depends on server-side Better Auth validation and explicit ownership filters. Treat every change to private route handlers as authorization-sensitive.

## Phase 15: Stabilization and cleanup

During the stabilization window:

- Monitor Vercel Runtime Logs, the Observability tab, and Sentry.
- Monitor PostgreSQL connection counts.
- Monitor failed Google callbacks.
- Check for `relation does not exist`, `permission denied`, and connection-pool errors.
- Confirm new users receive `public.profiles` rows.
- Confirm existing user-owned records still use the preserved UUID.
- Keep the old Supabase OAuth callback registered.
- Keep the old Supabase Auth tables and backup available.

After the rollback window closes, document a separate cleanup decision for unused Supabase Auth provider configuration. Do not delete authentication history as an incidental part of this migration.

## Rollback considerations

Rolling back only the application code is not sufficient after migration `023`. Promoting a previous Vercel deployment, or flipping DNS back to the old Cloudflare Workers, restores the *code* but not the database.

The old application expects:

- `public.profiles.id` to reference `auth.users.id`.
- The old `auth.users` profile trigger.
- Private RLS policies based on `auth.uid()`.
- Supabase Auth sessions.

Migration `023` changes all of those assumptions. A full rollback therefore requires either:

1. Restoring the Supabase database to the pre-cutover backup/recovery point and redeploying the old application, or
2. Applying a separately reviewed reverse migration that restores the old foreign key, trigger, and policies.

Do not improvise a production reverse migration during an incident. Prefer the verified backup/recovery procedure.

## Troubleshooting

### Google returns `redirect_uri_mismatch`

Check that:

- `BETTER_AUTH_URL` uses the actual production origin.
- The Google redirect URI is exactly `BETTER_AUTH_URL + /api/auth/callback/google`.
- HTTPS, hostname, path, port, and trailing slash match.
- The `GOOGLE_CLIENT_ID` in Vercel belongs to the Google client you edited.

### Better Auth reports that its base URL or secret is missing

On Vercel a variable assigned to an environment scope is present both during `next build` and at runtime, so the old "set in one surface but not the other" failure mode is gone. What remains is a **scope** mismatch.

Check that `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` are ticked for the scope being deployed — a variable set only for Production is absent from Preview builds. Then redeploy: environment-variable edits do not apply to an already-built deployment.

### Google provider is missing its client ID or secret

Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the Vercel environment scope being deployed, then redeploy. Confirm there are no accidental spaces, newlines, or surrounding quotes in the dashboard values — pasting a multi-line value is a common cause.

### `relation "user" does not exist`

Check:

- Migration `022` ran in the same Supabase project used by `DATABASE_URL`.
- `better_auth.user` exists.
- The database role can use the `better_auth` schema.
- The connection search path begins with `better_auth`.
- The deployment is not accidentally using staging database credentials in production.
- `search_path` actually applied. This is the signature failure of the Supavisor **transaction** pooler (port 6543) discarding session state — switch `DATABASE_URL` to the **session** pooler on port 5432. Run `npm run check-db -- --strict` to confirm.

### `permission denied for schema better_auth`

The database role in `DATABASE_URL` lacks schema/table privileges. Initially use the Supabase-provided database owner/pooler connection or grant the dedicated runtime role the necessary access after reviewing the commented grant examples in migration `022`.

### Existing user receives a new account or linking error

Compare:

- The migrated `better_auth.user.email`.
- The verified email returned by Google.
- Existing `better_auth.account` rows for provider `google`.

Do not manually reassign provider account IDs without investigating. Better Auth uses the provider plus provider account ID as the stable external identity.

Better Auth account linking is documented here:

<https://better-auth.com/docs/concepts/users-accounts>

### Private requests return unauthorized after successful Google login

Check:

- The browser received the Better Auth session cookie.
- `BETTER_AUTH_URL` matches the browser origin.
- The deployment receives the same cookie domain.
- `BETTER_AUTH_SECRET` is identical across builds and runtime deployments.
- The session row exists and has not expired.

### Private data operations fail with a Supabase error

Check:

- `SUPABASE_SERVICE_ROLE_KEY` is present in the deployed Vercel environment scope.
- The key belongs to the same project as `NEXT_PUBLIC_SUPABASE_URL`.
- The request passed Better Auth validation.
- The server query includes the authenticated user ID ownership filter.

Do not fix this by exposing the elevated key to the browser or by adding broad anonymous RLS policies.

### Too many PostgreSQL connections

**This matters more on Vercel than it did on Workers.** Serverless scales by process: every concurrently-executing function instance builds its own `pg` pool, and instances are created and discarded constantly. A pool size that looks harmless multiplied by burst concurrency will exhaust Postgres' connection limit, and the symptom is a site-wide auth outage rather than a slow query.

The configuration in `lib/auth.ts` is deliberate and should not be "tuned up":

- `max: 1` — one connection per function instance. **Supavisor**, not this pool, does the real fan-out. Raising this multiplies directly by concurrency.
- `min: 0` — no connections held open by an idle instance.
- `idleTimeoutMillis: 10_000` — release the pooler slot quickly once an instance goes quiet.
- `allowExitOnIdle: true` — an idle pool must not keep a serverless invocation's event loop alive.
- `connectionTimeoutMillis: 10_000` — a saturated pooler produces a fast explicit error instead of hanging until the function timeout.
- A pool-level `error` listener is mandatory. Without one, an idle client dropped by the pooler emits an unhandled `error` event and crashes the entire instance.

If you are hitting connection limits:

1. Confirm `DATABASE_URL` is the **pooler** host, not the direct endpoint. A direct connection bypasses Supavisor entirely.
2. Confirm you are on the **session** pooler (5432). Do not "fix" connection pressure by switching to transaction mode (6543) — that breaks `search_path` under concurrency, which is a worse failure. See Phase 4.
3. Check Supabase -> Database -> connection count while under load. A count that climbs steadily and never falls indicates connections are not being released.
4. Look for other consumers sharing the quota: the GitHub Actions funding pipeline, `scripts/`, local sessions, and any SQL editor tab.

### GitHub CI passes but the Vercel build fails

CI and Vercel run different commands in different environments. Compare:

- **Node version.** CI pins Node 22; set the same under `Project -> Settings -> General -> Node.js Version`.
- **Environment variables.** CI runs with almost none. Vercel builds with everything ticked for the target scope, so a build-time validation error can appear on Vercel and not in CI — and vice versa, a missing `NEXT_PUBLIC_*` in the Preview scope breaks only Preview.
- **Root directory.** Must be the repository root, not `landing/`.
- **Install command.** CI uses `npm ci`; `vercel.json` declares `npm install`. A lockfile that is out of sync can pass one and fail the other.
- **Production branch** set to `main`.

Note that `next build` always runs with `NODE_ENV=production`. Code that gates on `NODE_ENV` to detect a deployed environment will misfire during CI builds — this is exactly why `lib/supabase.ts` discriminates on `VERCEL_ENV` instead.

### `SELF_SIGNED_CERT_IN_CHAIN` when connecting to Postgres

`DATABASE_URL` has a `?sslmode=` parameter on it. Remove it.

`pg` >= 8.11 treats `sslmode=require|prefer|verify-ca` as verify-full and lets the URL override the driver's `ssl` option. Supabase's certificate chains to its own private *Supabase Root 2021 CA*, which Node does not trust, so the handshake fails with openssl verify code 19.

`lib/auth.ts` strips `sslmode`, `uselibpqcompat`, and `sslrootcert` for Supabase hosts and owns TLS itself, so the connection is still encrypted without the parameter. Set `DATABASE_SSL_CA` to Supabase's root CA PEM if you want full verification. See Phase 4.

### Site renders with zero deals and no error

Supabase is misconfigured for that environment. `data/funding-data.ts` is an intentionally empty placeholder, not a fallback dataset.

On a deployed environment `requireSupabaseConfigured()` in `lib/supabase.ts` throws `MissingSupabaseConfigError` rather than serving the empty placeholder, and reports once to Sentry. If you are instead seeing a silently empty site, you are either running off Vercel (CI, vitest, local dev — permissive by design, with a one-time console warning) or on a preview deployment with `ALLOW_MISSING_SUPABASE=1` set. That flag is ignored when `VERCEL_ENV=production`.

Check `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for the deployed scope, then redeploy — the two `NEXT_PUBLIC_*` values are inlined at build time.

## Final production checklist

- [ ] The correct Supabase project has been identified.
- [ ] A recent backup or recovery point exists.
- [ ] The database preflight queries have no unexplained results.
- [ ] Migration `022` has completed.
- [ ] The Better Auth tables exist in `better_auth`.
- [ ] The Supabase project URL and browser-safe key are configured.
- [ ] The elevated Supabase server key is stored only as a secret.
- [ ] `DATABASE_URL` points to the correct Supabase database.
- [ ] `BETTER_AUTH_SECRET` has been generated and stored safely.
- [ ] `BETTER_AUTH_URL` matches the final HTTPS origin.
- [ ] Google OAuth has the exact production callback URI.
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
- [ ] `ADMIN_EMAILS` is configured.
- [ ] All `NEXT_PUBLIC_*` values exist during the build.
- [ ] All Vercel Production-scope variables are set, secrets marked Sensitive.
- [ ] `DATABASE_URL` uses the **session** pooler (5432) with **no** `sslmode` suffix.
- [ ] `npm run check-db -- --strict` passes against the production URL.
- [ ] `npm run build` succeeds.
- [ ] A deployable Vercel build is ready to promote.
- [ ] The maintenance/cutover window has started.
- [ ] Migration `023` has completed.
- [ ] The new Vercel deployment was promoted immediately afterward.
- [ ] A migrated Google user can sign in and retains the old UUID.
- [ ] Private features enforce user ownership.
- [ ] Administrator access works only for the allowlist.
- [ ] Monitoring shows no unexplained authentication or database failures.

## Repository references

- `supabase/migrations/022_better_auth_schema.sql`
- `supabase/migrations/023_cutover_to_better_auth.sql`
- `lib/auth.ts`
- `lib/auth/server.ts`
- `lib/auth/admin.ts`
- `lib/supabase/privileged.ts`
- `lib/supabase.ts`
- `lib/avatar.ts`
- `scripts/check-db.mjs`
- `.env.example`
- `vercel.json`
- `DEPLOYMENT.md`
- `VERCEL_CUTOVER_RUNBOOK.md`
- `SECURITY.md`
