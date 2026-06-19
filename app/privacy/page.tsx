import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Arthaive collects, uses, retains, and protects your data — Google account details and your activity on the platform — and your rights under India's DPDP Act 2023 and the GDPR.",
}

const LAST_UPDATED = "19 June 2026"
const CONTACT = "8harath.k@gmail.com"

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-8 md:py-16">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-green-700">
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-800">
        <section>
          <p>
            Arthaive (&ldquo;Arthaive&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;) is India&rsquo;s open startup funding intelligence
            platform — a continuously-maintained, sourced record of Indian
            startup funding. This policy explains what personal data we collect
            when you use the platform, why we collect it, how long we keep it,
            who we share it with, and the rights you have over it. It is written
            to meet our obligations under India&rsquo;s Digital Personal Data
            Protection Act, 2023 (the &ldquo;DPDP Act&rdquo;) and, where it
            applies to you, the EU/UK General Data Protection Regulation
            (&ldquo;GDPR&rdquo;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            1. What data we collect
          </h2>
          <p className="mt-3">
            <strong>Account data (from Google Sign-In).</strong> Arthaive uses
            Google OAuth as its only sign-in method. When you sign in, Google
            shares with us your <strong>email address</strong>, your{" "}
            <strong>display name</strong>, and your{" "}
            <strong>profile picture (avatar)</strong>, plus a stable account
            identifier. We do not receive or store your Google password.
          </p>
          <p className="mt-3">
            <strong>Activity data you create on the platform.</strong> As you
            use Arthaive we store the records you generate so we can show them
            back to you:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Bookmarks and saved deals</li>
            <li>Watchlists</li>
            <li>Saved searches and search filters</li>
            <li>Alerts and alert criteria</li>
            <li>Private notes and tags you attach to deals</li>
            <li>API keys you generate (if you use the API)</li>
          </ul>
          <p className="mt-3">
            <strong>Behavioural &amp; technical data.</strong> We collect basic
            usage analytics (pages visited, features used, approximate region,
            device/browser type) to understand how the product is used and to
            keep it secure. This is collected via Vercel Analytics in a
            privacy-respecting, cookie-light manner.
          </p>
          <p className="mt-3">
            We do <strong>not</strong> knowingly collect sensitive personal
            data, and the funding records on the platform are facts about
            companies and investors, not about you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            2. Why we use it, and our legal basis
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>To authenticate you and run your account</strong> — your
              Google email, name, and avatar identify your account and personalise
              the interface. Legal basis: performance of our service to you /
              your consent under the DPDP Act.
            </li>
            <li>
              <strong>To deliver the features you ask for</strong> — bookmarks,
              watchlists, saved searches, alerts, and notes only exist because
              you created them and asked us to keep them. Legal basis:
              performance of the service.
            </li>
            <li>
              <strong>To operate, secure, and improve the platform</strong> —
              analytics, rate-limiting, and abuse prevention. Legal basis:
              legitimate interests (GDPR) / legitimate use (DPDP Act).
            </li>
          </ul>
          <p className="mt-3">
            We do <strong>not</strong> sell your personal data, and we do not use
            it for third-party advertising.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            3. Who we share it with (sub-processors)
          </h2>
          <p className="mt-3">
            We rely on a small number of infrastructure providers who process
            data on our behalf under their own data-protection terms:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Supabase</strong> — our database and authentication backend.
              Stores your account record and the activity data listed above.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting and privacy-respecting
              usage analytics.
            </li>
            <li>
              <strong>Google</strong> — identity provider for Sign-In (OAuth).
            </li>
            <li>
              <strong>Anthropic</strong> — used to power AI-assisted features and
              data processing. Where content is sent to Anthropic for processing,
              it is not used to train their models.
            </li>
          </ul>
          <p className="mt-3">
            Some of these providers may process data outside India. Where that
            happens we rely on the providers&rsquo; contractual safeguards for
            cross-border transfers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            4. How long we keep it
          </h2>
          <p className="mt-3">
            We keep your account data and the activity data you create for as
            long as your account is active. If you delete a specific item
            (a bookmark, note, saved search, alert, or API key) it is removed
            from your account. If you ask us to delete your account, we delete
            your account record and associated activity data within{" "}
            <strong>30 days</strong>, except where we are required to retain
            limited information to comply with law or to resolve disputes.
            Aggregated, non-identifying analytics may be retained.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            5. Your rights
          </h2>
          <p className="mt-3">
            Under the DPDP Act 2023 and, where applicable, the GDPR, you have
            the right to:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Access the personal data we hold about you</li>
            <li>Correct or update inaccurate or incomplete data</li>
            <li>Erase your data / withdraw consent and close your account</li>
            <li>Object to or restrict certain processing</li>
            <li>Receive a copy of your data in a portable form</li>
            <li>Nominate another individual to exercise these rights (DPDP Act)</li>
            <li>
              Lodge a complaint with the Data Protection Board of India or your
              local supervisory authority
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-semibold text-green-700 underline"
            >
              {CONTACT}
            </a>
            . We act as the Data Fiduciary / Data Controller for this data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            6. Security
          </h2>
          <p className="mt-3">
            Data is stored with our infrastructure providers using
            industry-standard encryption in transit and at rest, and access is
            restricted. Authentication is delegated to Google, so we never hold
            your password.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            7. Changes &amp; contact
          </h2>
          <p className="mt-3">
            We may update this policy as the platform evolves; we will revise the
            &ldquo;last updated&rdquo; date above. For any privacy question or to
            make a data-subject request, contact{" "}
            <a
              href={`mailto:${CONTACT}`}
              className="font-semibold text-green-700 underline"
            >
              {CONTACT}
            </a>
            . For how the funding records themselves are sourced — and how to
            request a correction or removal of a record — see our{" "}
            <Link href="/about" className="font-semibold text-green-700 underline">
              Methodology
            </Link>{" "}
            page.
          </p>
        </section>
      </div>
    </main>
  )
}
