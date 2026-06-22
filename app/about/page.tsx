import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "How Arthaive builds India's open startup funding record — our sources (Entrackr, Inc42, YourStory), how each record is tied to its source, the dataset licence, and how to request a correction or removal.",
}

const CONTACT = "8harath.k@gmail.com"

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-8 md:py-16">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-green-700">
        About
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
        About &amp; Methodology
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
        Arthaive is India&rsquo;s open startup funding intelligence platform — a
        continuously-maintained, sourced record of who raised, how much, from
        whom, and when, from 2015 to today.
      </p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-800">
        <section>
          <h2 className="text-xl font-bold tracking-tight">What Arthaive is</h2>
          <p className="mt-3">
            We track Indian startup funding rounds and the investors behind them
            and present them in one searchable, analysable record — currently
            13,000+ deals and 8,000+ investors with continuous coverage from
            2015 onward. The goal is a single, honest, open ledger of Indian
            startup funding that anyone can read and build on.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">Where the data comes from</h2>
          <p className="mt-3">
            Every funding record on Arthaive is compiled from public reporting by
            India&rsquo;s startup and funding press, principally:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>
              <strong>Entrackr</strong>
            </li>
            <li>
              <strong>Inc42</strong>
            </li>
            <li>
              <strong>YourStory</strong>
            </li>
          </ul>
          <p className="mt-3">
            We capture the facts a round reports — company, stage, amount, date,
            sector, and the participating investors — and tie each record to the
            source article it was drawn from. Records are <strong>facts linked
            to sources</strong>: we are reporting what was publicly reported, not
            making independent claims. We do not publish private or confidential
            information, and the platform holds facts about companies and
            investors, not personal profiles of individuals.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">How records are built</h2>
          <p className="mt-3">
            New funding reports are ingested on an ongoing basis, normalised into
            a consistent structure (consistent amount units, stage labels, and
            sector tags), de-duplicated against existing records, and linked back
            to their source. Amounts are recorded as reported; where a round is
            reported as undisclosed, it is marked as such rather than estimated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">Licence</h2>
          <p className="mt-3">
            The compiled Arthaive dataset is published under the{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              className="font-semibold text-green-700 underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
            </a>{" "}
            licence — use it, including commercially, with attribution to
            Arthaive and under the same licence. See our{" "}
            <Link href="/terms" className="font-semibold text-green-700 underline">
              Terms
            </Link>{" "}
            for details.
          </p>
        </section>

        <section
          id="corrections"
          className="neo-border bg-green-50 p-6 md:p-7"
        >
          <h2 className="text-xl font-bold tracking-tight">
            Request a correction or removal
          </h2>
          <p className="mt-3">
            Because every record is a fact tied to a public source, we take
            accuracy seriously. If you are a founder, investor, or company and a
            record about you is <strong>inaccurate</strong>, out of date, or you
            would like it <strong>removed</strong>, we want to fix it.
          </p>
          <p className="mt-3">
            Email{" "}
            <a
              href={`mailto:${CONTACT}?subject=Arthaive%20record%20correction%2Fremoval%20request`}
              className="font-semibold text-green-700 underline"
            >
              {CONTACT}
            </a>{" "}
            with:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>The company or deal in question (a link to the deal page helps)</li>
            <li>What is wrong, or that you are requesting removal</li>
            <li>The correct information and a source, if you have one</li>
          </ul>
          <p className="mt-3">
            We review correction and removal requests promptly and will update or
            remove the record where warranted. This is also the contact for any
            data-subject request under our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-green-700 underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">Contact</h2>
          <p className="mt-3">
            General enquiries, source suggestions, and feedback:{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-semibold text-green-700 underline"
            >
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
