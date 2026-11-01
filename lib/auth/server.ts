import { headers } from "next/headers"
import { withRequestAuth, type AuthSession, type AuthUser } from "@/lib/auth"

export async function getAuthSession(): Promise<AuthSession | null> {
  const requestHeaders = await headers()
  return withRequestAuth((auth) => auth.api.getSession({ headers: requestHeaders }))
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
