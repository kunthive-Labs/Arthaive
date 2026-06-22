import Link from "next/link"

// App-wide footer. Carries the legal + provenance links that must be reachable
// from every page (and that Google's OAuth verification looks for): Privacy,
// Terms, About/Methodology, and a visible correction/removal request link.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-black bg-white px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-gray-700">
          <Link href="/about" className="hover:text-green-700">
            About &amp; Methodology
          </Link>
          <Link href="/privacy" className="hover:text-green-700">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-green-700">
            Terms
          </Link>
          <Link href="/about#corrections" className="hover:text-green-700">
            Report a correction / request removal
          </Link>
        </nav>
        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
          © 2026 Arthaive · 2015–2026
        </p>
      </div>
    </footer>
  )
}
