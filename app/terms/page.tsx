import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Arthaive — India's open startup funding intelligence platform: acceptable use, data accuracy, the dataset licence, API use, and limitations of liability.",
}

const LAST_UPDATED = "19 June 2026"
const CONTACT = "8harath.k@gmail.com"

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-8 md:py-16">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-green-700">
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-800">
        <section>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of Arthaive (&ldquo;Arthaive&rdquo;, the
            &ldquo;platform&rdquo;), India&rsquo;s open startup funding
            intelligence platform. By signing in or using the platform you agree
            to these Terms. If you do not agree, do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">1. Accounts</h2>
          <p className="mt-3">
            Access requires signing in with a Google account. You are responsible
            for activity under your account and for keeping your Google account
            secure. You must be capable of forming a binding contract to use the
            platform. We may suspend or terminate accounts that breach these
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            2. The data, and accuracy
          </h2>
          <p className="mt-3">
            Arthaive compiles funding records from public reporting (see our{" "}
            <Link href="/about" className="font-semibold text-green-700 underline">
              Methodology
            </Link>
            ). Each record is a statement of fact linked to the source it was
            drawn from. We work to keep records accurate but the platform is
            provided <strong>&ldquo;as is&rdquo;</strong> for informational
            purposes only. It is <strong>not</strong> investment, legal,
            financial, or professional advice, and you should not rely on it as
            the sole basis for any decision. If you believe a record is wrong,
            please{" "}
            <Link
              href="/about#corrections"
              className="font-semibold text-green-700 underline"
            >
              request a correction or removal
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            3. Acceptable use
          </h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>
              Scrape, bulk-download, or systematically harvest the platform
              beyond what the published API and its rate limits allow
            </li>
            <li>
              Circumvent authentication, rate-limiting, or other technical
              controls
            </li>
            <li>
              Use the platform to break any law, or to infringe the rights of
              others
            </li>
            <li>
              Disrupt or degrade the platform&rsquo;s infrastructure or other
              users&rsquo; access
            </li>
            <li>
              Misrepresent the data or present it as your own original dataset
              without attribution
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            4. Dataset licence &amp; attribution
          </h2>
          <p className="mt-3">
            The compiled Arthaive funding dataset is made available under the{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              className="font-semibold text-green-700 underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
            </a>{" "}
            licence. You may share and adapt it, including commercially, provided
            you give appropriate credit to Arthaive, link to the licence, and
            distribute any derivative under the same licence. Individual facts
            remain attributable to their original reporting sources.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">5. API</h2>
          <p className="mt-3">
            If you use the Arthaive API, you must use your own API key, stay
            within published rate limits, and not share or resell access. We may
            change, throttle, or revoke API access to protect the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            6. Your content
          </h2>
          <p className="mt-3">
            Notes, tags, watchlists, saved searches, and other content you create
            remain yours. You grant us the limited right to store and process
            that content solely to provide the platform to you, as described in
            our{" "}
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
          <h2 className="text-xl font-bold tracking-tight">
            7. Disclaimers &amp; limitation of liability
          </h2>
          <p className="mt-3">
            To the maximum extent permitted by law, Arthaive is provided without
            warranties of any kind, including accuracy, completeness, fitness for
            a particular purpose, or uninterrupted availability. To the extent
            permitted by law, Arthaive and its operators will not be liable for
            any indirect, incidental, or consequential loss arising from your use
            of, or inability to use, the platform or its data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight">
            8. Changes, governing law &amp; contact
          </h2>
          <p className="mt-3">
            We may update these Terms; continued use after a change means you
            accept the revised Terms. These Terms are governed by the laws of
            India. Questions about these Terms can be sent to{" "}
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
