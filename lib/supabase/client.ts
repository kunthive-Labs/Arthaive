import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { isConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

type BrowserClient = ReturnType<typeof createSupabaseClient<Database>>

function missingConfigClient(): BrowserClient {
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      async getUser() {
        return { data: { user: null }, error: null }
      },
      async signInWithOAuth() {
        return {
          data: { provider: null, url: null },
          error: new Error("Supabase is not configured"),
        }
      },
      async signOut() {
        return { error: null }
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              id: "missing-supabase-config",
              callback: () => {},
              unsubscribe: () => {},
            },
          },
        }
      },
    },
    from() {
      throw new Error("Supabase is not configured")
    },
    channel() {
      return {
        on() {
          return this
        },
        subscribe() {
          return this
        },
        unsubscribe() {},
      }
    },
    removeChannel() {},
  } as unknown as BrowserClient
}

export function createClient() {
  if (!isConfigured) return missingConfigClient()

  return createSupabaseClient<Database>(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!
  )
}
