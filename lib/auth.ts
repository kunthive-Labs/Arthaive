import { betterAuth, type BetterAuthOptions } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"
import { Kysely, PostgresDialect, WithSchemaPlugin } from "kysely"
import { getCloudflareContext } from "@opennextjs/cloudflare"

const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL is not set; Better Auth database operations will fail")
}

const pool = new Pool({
  connectionString,
  // Keep Better Auth's tables isolated from the application's public tables.
  // The CLI reads this option as well when generating or applying migrations.
  options: "-c search_path=better_auth",
  max: 5,
})

function createAuth(database: BetterAuthOptions["database"]) {
  return betterAuth({
    appName: "Arthaive",
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database,
    advanced: {
      database: {
        // Existing application-owned user references are UUID columns.
        generateId: "uuid",
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        allowDifferentEmails: false,
      },
    },
    plugins: [nextCookies()],
  })
}

export const auth = createAuth(pool)

/** Hyperdrive pools connections per transaction, so qualify the auth schema
 * on every query and keep each database client within its request. */
export async function withRequestAuth<T>(run: (instance: typeof auth) => Promise<T>): Promise<T> {
  if (process.env.DEPLOYMENT_PLATFORM !== "cloudflare") return run(auth)

  const { env, ctx } = getCloudflareContext()
  const requestPool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
  })
  const database = new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({ pool: requestPool }),
    plugins: [new WithSchemaPlugin("better_auth")],
  })
  try {
    return await run(createAuth({ db: database, type: "postgres" }))
  } finally {
    ctx.waitUntil(database.destroy())
  }
}

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"]
