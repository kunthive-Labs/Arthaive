import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config"

/**
 * Server-only Supabase client for data access after Better Auth validates the
 * request. Because the service role bypasses RLS, user-owned queries must use
 * an explicit ownership predicate derived from the authenticated session.
 */
export function createPrivilegedClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase server access requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
