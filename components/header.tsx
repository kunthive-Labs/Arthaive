"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { SearchBar } from "./search-bar"
import { HeaderAccount } from "./nav/header-account"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/analytics", label: "Analytics" },
  { href: "/dashboard/custom", label: "My Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/search", label: "Ask AI" },
  { href: "/api-docs", label: "API" },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-between gap-4 md:gap-6 md:mb-6">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="neo-border-accent p-1.5 bg-white">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-[#1a5d1a]"></div>
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">ARTHAIVE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap font-bold text-sm uppercase tracking-wide transition hover:text-green-700 ${
                    active ? "text-green-700 underline decoration-[3px] underline-offset-[6px]" : ""
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <HeaderAccount />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="md:hidden neo-border bg-white p-2 neo-press"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search: full width below the bar on desktop; hidden behind the menu on mobile */}
        <div className="hidden md:block">
          <SearchBar />
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t-4 border-black bg-white">
          <nav className="flex flex-col divide-y-[3px] divide-black">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3.5 font-bold uppercase tracking-wide transition ${
                    active ? "bg-[#1a5d1a] text-white" : "hover:bg-[#1a5d1a]/10"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t-4 border-black p-4">
            <SearchBar />
          </div>
        </div>
      )}
    </header>
  )
}
