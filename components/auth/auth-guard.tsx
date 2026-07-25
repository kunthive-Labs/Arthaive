import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth/server"

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  return <>{children}</>
}
