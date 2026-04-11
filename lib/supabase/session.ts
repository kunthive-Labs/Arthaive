import { createClient } from "./server"

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}


export async function getSessionUserId(): Promise<string | null> {
  const user = await getUser()
  return user?.id ?? null
}


export async function isSessionValid(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  return new Date(session.expires_at! * 1000) > new Date()
}
