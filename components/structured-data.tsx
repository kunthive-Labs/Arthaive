// Server-rendered JSON-LD for SEO. Two graphs that matter most for a data site:
// an Organization (brand/identity) and a Dataset (the funding record itself,
// which is the thing search engines and dataset crawlers should surface).
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://arthaive.kunthive.in"

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Arthaive",
  url: BASE_URL,
  logo: `${BASE_URL}/icon.svg`,
  description:
    "Arthaive is India's open startup funding intelligence platform — a continuously-maintained, sourced record of Indian startup funding from 2015 onward.",
  email: "8harath.k@gmail.com",
  foundingDate: "2015",
  areaServed: "IN",
  sameAs: [] as string[],
}

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Indian Startup Funding Dataset",
  alternateName: "Arthaive Funding Ledger",
  description:
    "A continuously-maintained dataset of Indian startup funding rounds from 2015 to today: 13,000+ deals and 8,000+ investors, with each record linked to its reporting source. Covers company, round/stage, amount, date, sector, and investors.",
  url: `${BASE_URL}/explore`,
  keywords: [
    "startup funding",
    "India",
    "venture capital",
    "seed funding",
    "Series A",
    "investors",
  ],
  license: "https://creativecommons.org/licenses/by-sa/4.0/",
  isAccessibleForFree: true,
  creator: {
    "@type": "Organization",
    name: "Arthaive",
    url: BASE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Arthaive",
    url: BASE_URL,
  },
  temporalCoverage: "2015/..",
  spatialCoverage: {
    "@type": "Place",
    name: "India",
  },
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${BASE_URL}/api/v1`,
    },
  ],
}

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
    </>
  )
}
