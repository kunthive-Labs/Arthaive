import type { User, Session } from "@supabase/supabase-js"

export type { User, Session }

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
