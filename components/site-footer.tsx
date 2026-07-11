import Link from "next/link"

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/explore", label: "Explore deals" },
      { href: "/analytics", label: "Analytics" },
      { href: "/reports", label: "Reports" },
      { href: "/api-docs", label: "API" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About & Methodology" },
      { href: "/submit", label: "Submit a deal" },
      { href: "/about#corrections", label: "Corrections / removal" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
]

// App-wide footer. Carries the legal + provenance links that must be reachable
// from every page (and that Google's OAuth verification looks for): Privacy,
// Terms, About/Methodology, and a visible correction/removal request link.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-black bg-[#0B0B0B] px-4 py-10 text-white md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-[1.15fr_1.85fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="border-[3px] border-green-600 bg-white p-1.5" aria-hidden>
              <span className="block h-4 w-4 bg-[#1A5D1A]" />
            </span>
            <span className="text-xl font-bold tracking-tight">Arthaive</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-300">
            India&apos;s structured startup funding ledger, maintained from public
            reporting and built for repeatable market research.
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-gray-400">
            © 2026 Arthaive · Coverage 2005-2026
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-3">
          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-green-400">
                {section.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-gray-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col gap-3 border-t border-white/20 pt-5 text-xs leading-relaxed text-gray-400 md:flex-row md:items-center md:justify-between">
        <p>Funding records are compiled from public sources and may be corrected on request.</p>
        <Link href="/about#corrections" className="font-bold text-white hover:text-green-300">
          Report a correction / request removal
        </Link>
      </div>
    </footer>
  )
}
