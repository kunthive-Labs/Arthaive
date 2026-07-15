import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Bookmark,
  ChartNoAxesCombined,
  FileText,
  Layers,
  Search,
  Sparkles,
} from "lucide-react"
import { SignInButton } from "@/components/auth/sign-in-button"

// One ticker line: company + the round it raised, set in mono like a tape.
export interface TickerDeal {
  company: string
  amountCr: string
  stage: string
}

interface LandingProps {
  tickerDeals: TickerDeal[]
  dealCount: number
  authError?: boolean
}

// The public face of the ledger: a members'-broadsheet front page anyone can
// read. Browsing is open — no account required — so the primary action is to
// start exploring; signing in is the secondary path that unlocks saving.
// Server-rendered; the only client island is <SignInButton>.
export function Landing({ tickerDeals, dealCount, authError }: LandingProps) {
  const count = dealCount.toLocaleString("en-IN")

  // What you can do — every card links straight into the live product, so the
  // landing is a launcher, not a wall.
  const exploreItems = [
    {
      icon: Search,
      title: "Explore the full ledger",
      body: `${count} verified rounds — filter by sector, stage, city, amount and date across two decades.`,
      href: "/explore",
      cta: "Open Explore",
    },
    {
      icon: ChartNoAxesCombined,
      title: "Analyze the market",
      body: "Sector breakdowns, stage funnels, investor leaderboards and an India funding map.",
      href: "/analytics",
      cta: "See Analytics",
    },
    {
      icon: Layers,
      title: "Go sector by sector",
      body: "Per-sector funding timelines, top deals and the investors most active in each vertical.",
      href: "/sectors",
      cta: "Browse sectors",
    },
    {
      icon: FileText,
      title: "Read the reports",
      body: "Weekly and monthly funding recaps generated from source-backed records.",
      href: "/reports",
      cta: "Read reports",
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
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-700 transition hover:text-green-900 sm:inline-flex"
            >
              Explore
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/about"
              className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 transition hover:text-gray-900 sm:inline-flex"
            >
              Methodology
            </Link>
          </div>
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
              Free &amp; open · no account needed to browse
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
              funding, built for founders, analysts, investors, students, and the
              plain curious. Browse it all for free — filter, chart, and dig into
              every deal, no sign-up required.
            </p>

            {/* Primary path: start exploring. Signing in is secondary (right card). */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 neo-border neo-shadow bg-green-700 px-6 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-green-800"
              >
                Explore the ledger
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center justify-center gap-2 neo-border bg-white px-6 py-4 text-sm font-bold uppercase tracking-wide transition hover:bg-green-50"
              >
                <ChartNoAxesCombined className="h-4 w-4" />
                View analytics
              </Link>
            </div>

            {/* The signature: the count of the record, set like a ledger total */}
            <div className="mt-10 w-full max-w-sm neo-border neo-shadow bg-white px-5 py-5 sm:inline-block sm:w-auto sm:px-6">
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
                ["2005–26", "Continuous coverage"],
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

          {/* Free-account card — the secondary, save-your-research path */}
          <div className="lg:col-span-2">
            <div className="neo-border neo-shadow bg-white">
              <div className="flex items-center justify-between border-b-4 border-black bg-green-700 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">
                  Free account
                </span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-green-200">
                  Optional
                </span>
              </div>

              <div className="p-5 md:p-7">
                <p className="text-lg font-bold leading-relaxed text-gray-950">
                  Make it your research desk.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Everything above is free to browse. Sign in — one tap with
                  Google, no passwords — to save what you find.
                </p>

                {authError && (
                  <div className="mt-5 border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    Sign-in didn&apos;t complete. Please try again.
                  </div>
                )}

                <div className="mt-6">
                  <SignInButton />
                </div>

                {/* What an account adds */}
                <ul className="mt-7 space-y-3 border-t-2 border-gray-200 pt-5">
                  {[
                    { icon: Bookmark, text: "Bookmark deals and build watchlists" },
                    { icon: FileText, text: "Private notes and tags on any round" },
                    { icon: Bell, text: "Alerts when matching deals land" },
                    { icon: Sparkles, text: "Build your own custom dashboards" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden />
                      <span>{text}</span>
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

        {/* ── What you can do — launcher cards ───────────────────── */}
        <section className="border-y-4 border-black bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y-4 divide-black px-4 md:grid-cols-4 md:divide-x-4 md:divide-y-0 md:px-8">
            {exploreItems.map(({ icon: Icon, title, body, href, cta }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col py-6 transition hover:bg-green-50 md:px-5 md:py-8 md:first:pl-0 md:last:pr-0"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border-2 border-black bg-[#EFEDE3]">
                  <Icon className="h-5 w-5 text-green-700" aria-hidden />
                </div>
                <h2 className="text-base font-bold tracking-tight">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-700">
                  {cta}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Closing strip ──────────────────────────────────────── */}
        <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-green-700">
              Ask it anything
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700 md:text-base">
              Type a plain-English question — &ldquo;fintech Series A in Bangalore
              in 2024&rdquo; — and get a source-backed answer, or open the raw data
              and slice it yourself.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex w-full items-center justify-center gap-2 neo-border bg-green-700 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-green-800 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Ask AI
            </Link>
            <Link
              href="/about"
              className="inline-flex w-full items-center justify-center gap-2 neo-border bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide transition hover:bg-green-50 sm:w-auto"
            >
              Read methodology
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
