# Arthaive deployment guide

Arthaive is deployed as a **Cloudflare Worker** through the OpenNext Cloudflare
adapter. It is not a static Pages export: App Router route handlers, SSR, and
server components run inside the Worker.

Authorization is enforced inside protected pages and route handlers. The app
does not use Next.js 16 Node Proxy because that runtime is not yet supported by
the OpenNext Cloudflare adapter.

## Prerequisites

- Node.js 22 or newer
- A Cloudflare account with Workers enabled
- Wrangler authenticated locally (`npx wrangler login`) or a
  `CLOUDFLARE_API_TOKEN` in CI

Install the locked dependencies with:

```bash
npm ci
```

## Local development and Worker preview

Use the Next.js development server for normal development:

```bash
npm run dev
```

To test the actual `workerd` runtime, copy `.dev.vars.example` to `.dev.vars`,
add the required local secrets, and run:

```bash
npm run preview
```

The preview command builds the OpenNext artifact before starting Wrangler.
Local secrets in `.dev.vars` are ignored by Git.

## Environment variables and secrets

Next.js may need variables both while building and while the Worker is running.
For Cloudflare Workers Builds, configure build-time values under **Build
Variables and secrets**. Configure runtime secrets with Wrangler, for example:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put DATABASE_URL
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Set `BETTER_AUTH_URL` as a non-secret runtime variable to the canonical HTTPS
origin of the deployment (for example, `https://arthaive.example.com`).

Public `NEXT_PUBLIC_*` values are embedded during the Next.js build and must be
available to the build. Do not put secret values in `wrangler.jsonc` or commit a
`.dev.vars` file.

See `.env.example` for the application's complete variable list. Authentication
and database changes may add more variables over time.

## Validate and deploy

Build and validate the generated Worker without uploading it:

```bash
npm run deploy:dry-run
```

Deploy immediately:

```bash
npm run deploy
```

Or upload an immutable Worker version for a later/gradual rollout:

```bash
npm run upload
```

The Worker name and runtime settings live in `wrangler.jsonc`. Add custom
domains, routes, and Cloudflare resource bindings there so the file remains the
deployment source of truth.

## Cloudflare dashboard builds

When connecting the repository to Workers Builds, use:

- Build command: `npm run build:cloudflare`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Node version: 22 or newer

Add every variable required by `next build` to the dashboard's build variables.
Runtime-only secrets should remain Worker secrets.

## Caching

Static Next.js assets receive immutable cache headers from `public/_headers`.
The initial setup deliberately uses OpenNext's default in-memory incremental
cache. If the app begins relying on ISR or on-demand revalidation, provision R2
(and, where applicable, a queue/tag cache) and then add those bindings and
OpenNext cache overrides together.

## Updating the funding fixture

The OpenNext build invokes the existing `prebuild` hook, so funding data is
regenerated automatically. To regenerate it without building:

```bash
npm run generate-data
```
