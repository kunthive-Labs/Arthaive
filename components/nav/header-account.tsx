"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface SessionInfo {
  name: string | null
  email: string | null
}

// Compact sign-in / account control for the shared Header. The site is public,
// so this just offers an account: signed-out visitors get a "Sign in" button,
// signed-in users get their name + a link to the dashboard and a sign-out.
// Reads the public /api/auth/session endpoint so it works on every page.
export function HeaderAccount() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<SessionInfo | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { user: null, profile: null }))
      .then((data) => {
        if (!active) return
        if (data?.user) {
          setSession({
            name: data.profile?.full_name ?? data.user?.email ?? null,
            email: data.user?.email ?? null,
          })
        } else {
          setSession(null)
        }
      })
      .catch(() => active && setSession(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${location.pathname}` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    router.refresh()
  }

  if (loading) {
    return <div className="h-8 w-20 animate-pulse bg-gray-200" aria-hidden />
  }

  if (!session) {
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
        title={session.email ?? undefined}
      >
        {session.name}
      </Link>
      <button
        onClick={signOut}
        className="border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-black hover:text-white"
      >
        Sign out
      </button>
    </div>
  )
}
