import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type React from "react"

export const dynamic = "force-dynamic"

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review Queue" },
  { href: "/admin/entities", label: "Entities" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/pipeline", label: "Pipeline Logs" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/export", label: "Export" },
  { href: "/admin/ai-usage", label: "AI Usage" },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(user.email ?? "")) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Admin
          </span>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ← Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-8 max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
