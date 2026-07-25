import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth/server"
import type { AuthUser } from "@/lib/auth"

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && adminEmails().has(email.toLowerCase()))
}

export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser()
  return isAdminEmail(user?.email)
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/")
  return user
}
