import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"

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

export const auth = betterAuth({
  appName: "Arthaive",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
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

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"]
