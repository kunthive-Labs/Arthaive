import Link from "next/link"
import { SignInButton } from "@/components/auth/sign-in-button"

// One ticker line: company + the round it raised, set in mono like a tape.
export interface TickerDeal {
  company: string
  amountCr: string
  stage: string
}

interface SignInGateProps {
  tickerDeals: TickerDeal[]
  dealCount: number
  authError?: boolean
}

// The gate is the public face of an otherwise fully-private product: a members'
// broadsheet whose front page you can read, but whose ledger is sealed until you
// sign in. Server-rendered — the only client island is <SignInButton>.
export function SignInGate({ tickerDeals, dealCount, authError }: SignInGateProps) {
  const count = dealCount.toLocaleString("en-IN")

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Masthead ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 border-b-4 border-black px-4 py-3 md:px-8">
        <span className="text-2xl font-bold leading-none tracking-tight">
          Arthaive
        </span>
        <span className="hidden text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500 md:block">
          The Indian Startup Funding Ledger
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-700">
          Est. 2015
        </span>
      </header>

      {/* ── Live deal tape ─────────────────────────────────────── */}
      <div className="ticker-mask overflow-hidden border-b-4 border-black bg-black">
        <div className="ticker-track py-2 text-white">
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="inline-flex">
              {tickerDeals.map((d, i) => (
                <span
                  key={`${copy}-${i}`}
                  className="inline-flex items-center whitespace-nowrap px-5 font-mono text-xs"
                >
                  <span className="mr-2 inline-block h-1.5 w-1.5 bg-green-500" aria-hidden />
                  <span className="font-bold">{d.company}</span>
                  <span className="mx-2 text-gray-500">·</span>
                  <span className="text-green-400">{d.amountCr}</span>
                  <span className="ml-2 uppercase tracking-wider text-gray-500">
                    {d.stage}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-5 lg:gap-12">
        {/* Thesis */}
        <section className="lg:col-span-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-green-700">
            The open ledger
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
            Every rupee.
            <br />
            Every round.
            <br />
            <span className="text-green-700">On the record.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Arthaive is the continuously-maintained ledger of Indian startup
            funding — verified, sourced, and searchable. Browse, filter and
            analyze every deal for free. No account required.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="neo-border neo-shadow inline-flex items-center bg-green-700 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-green-800"
            >
              Explore the ledger →
            </Link>
            <Link
              href="/analytics"
              className="neo-border inline-flex items-center bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-gray-50"
            >
              See the analytics
            </Link>
          </div>

          {/* The signature: the count of the record, set like a ledger total */}
          <div className="mt-10 inline-block neo-border bg-green-50 px-6 py-5">
            <div className="font-mono text-6xl font-bold leading-none tracking-tight text-green-700 md:text-7xl">
              {count}
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">
              Funding deals on the record
            </div>
          </div>

          {/* Supporting figures */}
          <dl className="mt-8 grid max-w-xl grid-cols-3 border-t-2 border-black">
            {[
              ["8,000+", "Investors tracked"],
              ["2015–26", "Continuous coverage"],
              ["12+", "Sectors"],
            ].map(([n, label]) => (
              <div key={label} className="border-r-2 border-black py-4 pr-4 last:border-r-0">
                <dt className="font-mono text-2xl font-bold tracking-tight">{n}</dt>
                <dd className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Member-access credential card */}
        <section className="lg:col-span-2">
          <div className="neo-border neo-shadow bg-white">
            <div className="flex items-center justify-between border-b-4 border-black bg-green-700 px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">
                Free Account
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-200">
                Optional
              </span>
            </div>

            <div className="p-6 md:p-7">
              <p className="text-base font-semibold leading-relaxed text-gray-900">
                Make it yours — for free.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Browsing needs no account. Sign in with Google to save deals,
                build watchlists, and get alerts. No passwords to manage.
              </p>

              {authError && (
                <div className="mt-5 border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  Sign-in didn&apos;t complete. Please try again.
                </div>
              )}

              <div className="mt-6">
                <SignInButton />
              </div>

              {/* What membership opens */}
              <ul className="mt-7 space-y-2.5 border-t-2 border-gray-200 pt-5">
                {[
                  "Bookmark deals and build watchlists",
                  "Private notes and tags on any round",
                  "Saved searches you can return to",
                  "Alerts when matching deals land",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-gray-700"
                  >
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-green-700" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer rule ────────────────────────────────────────── */}
      <footer className="flex flex-col gap-3 border-t-4 border-black px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-gray-500 md:flex-row md:items-center md:justify-between md:px-8">
        <span>© 2026 Arthaive</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 normal-case tracking-normal">
          <Link href="/about" className="font-semibold hover:text-green-700">
            About
          </Link>
          <Link href="/privacy" className="font-semibold hover:text-green-700">
            Privacy
          </Link>
          <Link href="/terms" className="font-semibold hover:text-green-700">
            Terms
          </Link>
          <Link href="/about#corrections" className="font-semibold hover:text-green-700">
            Report a correction / request removal
          </Link>
        </nav>
        <span className="hidden md:inline">{count} deals · 2015–2026</span>
      </footer>
    </div>
  )
}
