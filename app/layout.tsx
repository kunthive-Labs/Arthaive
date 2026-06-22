import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SiteFooter } from "@/components/site-footer"
import { StructuredData } from "@/components/structured-data"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom — disabling it is an accessibility regression on mobile.
  maximumScale: 5,
  themeColor: "#000000",
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://arthaive.kunthive.in"
  ),
  title: {
    default: "Arthaive — Indian Startup Funding Intelligence",
    template: "%s | Arthaive",
  },
  description: "Discover, analyze, and track startup funding across India — 13,000+ deals from 2015 to today, 8,000+ investors, real-time insights.",
  keywords: ["startup funding", "india startups", "VC funding", "angel investors", "seed funding", "series A", "startup investment"],
  authors: [{ name: "Arthaive" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Arthaive",
    title: "Arthaive — Indian Startup Funding Intelligence",
    description: "Discover, analyze, and track startup funding across India — 13,000+ deals from 2015 to today, 8,000+ investors, real-time insights.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arthaive — Indian Startup Funding Intelligence",
    description: "13,000+ Indian startup funding deals from 2015 to today, 8,000+ investors, real-time insights.",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans antialiased bg-white text-black min-h-screen flex flex-col`}>
        <StructuredData />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
