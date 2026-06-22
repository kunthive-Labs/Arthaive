"use client"

import Link from "next/link"
import { SearchBar } from "./search-bar"
import { HeaderAccount } from "./nav/header-account"

export function Header() {
  return (
    <header className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between gap-6 mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="neo-border-accent p-2 bg-white">
              <div className="w-6 h-6 bg-black"></div>
            </div>
            <span className="text-xl font-bold tracking-tight hidden md:inline">ARTHAIVE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="font-bold text-sm hover:text-green-700 transition">
              HOME
            </Link>
            <Link href="/explore" className="font-bold text-sm hover:text-green-700 transition">
              EXPLORE
            </Link>
            <Link href="/analytics" className="font-bold text-sm hover:text-green-700 transition">
              ANALYTICS
            </Link>
            <Link href="/reports" className="font-bold text-sm hover:text-green-700 transition">
              REPORTS
            </Link>
            <Link href="/search" className="font-bold text-sm hover:text-green-700 transition">
              ASK&nbsp;AI
            </Link>
            <Link href="/api-docs" className="font-bold text-sm hover:text-green-700 transition">
              API
            </Link>
          </nav>

          <HeaderAccount />
        </div>

        <SearchBar />
      </div>
    </header>
  )
}
