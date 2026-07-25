"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

// Compact sign-in / account control for the shared Header. The site is public,
// so this just offers an account: signed-out visitors get a "Sign in" button,
// signed-in users get their name + a link to the dashboard and a sign-out.
// Better Auth's reactive session hook keeps this in sync on every page.
export function HeaderAccount() {
  const router = useRouter()
  const { data, isPending } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)

  async function signIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: location.pathname,
    })
  }

  async function signOut() {
    setSigningOut(true)
    await authClient.signOut()
    router.refresh()
    setSigningOut(false)
  }

  if (isPending) {
    return <div className="h-8 w-20 animate-pulse bg-gray-200" aria-hidden />
  }

  if (!data?.user) {
    return (
      <button
        onClick={signIn}
        className="neo-border bg-green-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-green-800"
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="hidden max-w-[12rem] truncate text-sm font-bold hover:text-green-700 sm:inline"
        aria-label="Account menu"
        title={data.user.email}
      >
        {data.user.name || data.user.email}
      </Link>
      <button
        onClick={signOut}
        disabled={signingOut}
        className="border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-black hover:text-white"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  )
}
