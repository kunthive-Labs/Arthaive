import Link from "next/link"
import { ArrowRight, Bell, Bookmark, ChartNoAxesCombined, Search } from "lucide-react"
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
  const accessItems = [
    {
      icon: Search,
      title: "Search the full ledger",
      body: `${count} verified funding rounds with source-backed company, investor, stage, date, and sector records.`,
    },
    {
      icon: ChartNoAxesCombined,
      title: "Analyze market movement",
      body: "Compare sectors, cities, stages, investors, and funding velocity from 2015 through today.",
    },
    {
      icon: Bookmark,
      title: "Save your research",
      body: "Bookmark rounds, keep private notes, and build watchlists around companies or investment themes.",
    },
    {
      icon: Bell,
      title: "Track new activity",
      body: "Create alerts for sectors, investors, stages, and companies so relevant updates do not get missed.",
    },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden bg-[#EFEDE3]">
      {/* ── Masthead ───────────────────────────────────────────── */}
      <header className="border-b-4 border-black bg-white px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="neo-border-accent bg-white p-1.5" aria-hidden>
              <span className="block h-4 w-4 bg-[#1A5D1A] md:h-5 md:w-5" />
            </span>
            <span className="text-xl font-bold leading-none tracking-tight md:text-2xl">
              Arthaive
            </span>
          </Link>
          <span className="hidden text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500 md:block">
            The Indian Startup Funding Ledger
          </span>
          <Link
            href="/about"
            className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-700 transition hover:text-green-900 sm:inline-flex"
          >
            Methodology
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Live deal tape ─────────────────────────────────────── */}
      <div className="flex items-stretch border-b-4 border-black bg-black">
        <div className="hidden items-center gap-2 whitespace-nowrap border-r-4 border-black bg-[#FF5A1F] px-4 font-mono text-[11px] font-bold uppercase tracking-widest text-black sm:flex">
          <span className="inline-block h-1.5 w-1.5 bg-black" aria-hidden />
          Latest raises
        </div>
        <div className="ticker-mask min-w-0 flex-1 overflow-hidden">
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
      </div>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:px-8 md:py-16 lg:grid-cols-5 lg:gap-12">
          {/* Thesis */}
          <div className="lg:col-span-3">
            <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-green-700">
              <span className="inline-block h-2.5 w-2.5 bg-[#FF5A1F]" aria-hidden />
              Members only
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3rem,14vw,4.5rem)] font-bold leading-[0.95] tracking-tight md:text-7xl">
              Every rupee.
              <br />
              Every round.
              <br />
              <span className="text-green-700">On the record.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-700 md:text-lg">
              Arthaive is the continuously-maintained ledger of Indian startup
              funding, built for founders, analysts, investors, and operators who
              need sourced funding intelligence without spreadsheet drift.
            </p>

            {/* The signature: the count of the record, set like a ledger total */}
            <div className="mt-8 w-full max-w-sm neo-border neo-shadow bg-white px-5 py-5 sm:inline-block sm:w-auto sm:px-6">
              <div className="ledger-figure text-[clamp(3rem,17vw,4.5rem)] font-bold leading-none text-green-700 md:text-7xl">
                {count}
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Funding deals on the record
              </div>
            </div>

            {/* Supporting figures */}
            <dl className="mt-8 grid max-w-2xl grid-cols-1 border-y-2 border-black sm:grid-cols-3 sm:border-t-2">
              {[
                ["8,000+", "Investors tracked"],
                ["2015-26", "Continuous coverage"],
                ["12+", "Sectors"],
              ].map(([n, label]) => (
                <div
                  key={label}
                  className="border-b-2 border-black py-4 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:pr-4 sm:last:border-r-0"
                >
                  <dt className="font-mono text-2xl font-bold tracking-tight">{n}</dt>
                  <dd className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Member-access credential card */}
          <div className="lg:col-span-2">
            <div className="neo-border neo-shadow bg-white">
              <div className="flex items-center justify-between border-b-4 border-black bg-green-700 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">
                  Member Access
                </span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-200">
                  No. 001
                </span>
              </div>

              <div className="p-5 md:p-7">
                <p className="text-lg font-bold leading-relaxed text-gray-950">
                  Open the funding ledger.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  One account, signed in with Google. No passwords to manage.
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
                <ul className="mt-7 space-y-3 border-t-2 border-gray-200 pt-5">
                  {[
                    `Search ${count} verified deals`,
                    "Bookmark deals and build watchlists",
                    "Private notes and tags on any round",
                    "Alerts when matching deals land",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-gray-700"
                    >
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-green-700" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 border-l-4 border-black bg-white px-4 py-3 text-sm font-semibold text-gray-700">
              Built from public reporting with source-backed records and a visible
              correction process.
            </div>
          </div>
        </section>

        <section className="border-y-4 border-black bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y-4 divide-black px-4 md:grid-cols-4 md:divide-x-4 md:divide-y-0 md:px-8">
            {accessItems.map(({ icon: Icon, title, body }) => (
              <article key={title} className="py-6 md:px-5 md:py-8 first:md:pl-0 last:md:pr-0">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border-2 border-black bg-[#EFEDE3]">
                  <Icon className="h-5 w-5 text-green-700" aria-hidden />
                </div>
                <h2 className="text-base font-bold tracking-tight">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-green-700">
              Research-grade coverage
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700 md:text-base">
              Browse, filter, compare, export, and monitor the Indian startup
              funding market from one structured source of truth.
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex w-full items-center justify-center gap-2 neo-border bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide transition hover:bg-green-50 sm:w-auto"
          >
            Read methodology
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  )
}
