import { headers } from "next/headers"
import { auth, type AuthSession, type AuthUser } from "@/lib/auth"

export async function getAuthSession(): Promise<AuthSession | null> {
  return auth.api.getSession({ headers: await headers() })
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getAuthSession()
  return session?.user ?? null
}

// Compatibility names used throughout existing API routes.
export const getSession = getAuthSession
export const getUser = getAuthUser

export async function getSessionUserId(): Promise<string | null> {
  const user = await getAuthUser()
  return user?.id ?? null
}

export async function isSessionValid(): Promise<boolean> {
  return (await getAuthSession()) !== null
}
