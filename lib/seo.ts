import { APP_NAME, APP_DESCRIPTION, APP_URL } from "@/lib/constants"
import type { Metadata } from "next"

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
    description: APP_DESCRIPTION,
    metadataBase: new URL(APP_URL),
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      description: APP_DESCRIPTION,
    },
    twitter: { card: "summary_large_image" },
    ...overrides,
  }
}

export function buildDealMetadata(company: string, amount: string, stage: string): Metadata {
  const title = `${company} raises ${amount} in ${stage} round`
  return buildMetadata({
    title,
    description: `${company} raised ${amount} funding in a ${stage} round. Explore more Indian startup funding data on ${APP_NAME}.`,
  })
}

export function buildInvestorMetadata(name: string, dealCount: number): Metadata {
  return buildMetadata({
    title: `${name} — Investor Profile`,
    description: `${name} has invested in ${dealCount} Indian startups. View portfolio, sector focus, and deal history.`,
  })
}
