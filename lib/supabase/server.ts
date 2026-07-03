import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"
import { isConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

type ServerClient = ReturnType<typeof createServerClient<Database>>

function missingConfigClient(): ServerClient {
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      async getUser() {
        return { data: { user: null }, error: null }
      },
      async exchangeCodeForSession() {
        return {
          data: { session: null, user: null },
          error: new Error("Supabase is not configured"),
        }
      },
    },
    from() {
      throw new Error("Supabase is not configured")
    },
    storage: {
      from() {
        throw new Error("Supabase is not configured")
      },
    },
  } as unknown as ServerClient
}

export async function createClient() {
  if (!isConfigured) return missingConfigClient()

  const cookieStore = await cookies()
  return createServerClient<Database>(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookies set by middleware
          }
        },
      },
    }
  )
}
