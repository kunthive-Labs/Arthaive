import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: {
    default: "IndiaFundTrack — Indian Startup Funding Intelligence",
    template: "%s | IndiaFundTrack",
  },
  description: "Discover, analyze, and track startup funding across India. 1600+ deals, 200+ investors, real-time insights.",
  keywords: ["startup funding", "india startups", "VC funding", "angel investors", "seed funding", "series A", "startup investment"],
  authors: [{ name: "IndiaFundTrack" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "IndiaFundTrack",
    title: "IndiaFundTrack — Indian Startup Funding Intelligence",
    description: "Discover, analyze, and track startup funding across India. 1600+ deals, 200+ investors, real-time insights.",
  },
  twitter: {
    card: "summary_large_image",
    title: "IndiaFundTrack — Indian Startup Funding Intelligence",
    description: "Discover, analyze, and track startup funding across India. 1600+ deals, 200+ investors.",
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
      <body className={`font-sans antialiased bg-white text-black`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
