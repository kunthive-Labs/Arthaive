import Link from "next/link"
import { Header } from "@/components/header"

export const metadata = {
  title: "404 — Page Not Found",
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-8xl font-bold text-green-700 mb-4">404</div>
        <h1 className="text-3xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-600 mb-8">The deal, investor, or page you're looking for doesn't exist or may have moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          <Link href="/" className="neo-border px-6 py-3 font-bold bg-green-700 text-white hover:bg-green-800 transition-colors">
            Go Home
          </Link>
          <Link href="/explore" className="neo-border px-6 py-3 font-bold bg-white hover:bg-gray-50 transition-colors">
            Browse Deals
          </Link>
          <Link href="/investors" className="neo-border px-6 py-3 font-bold bg-white hover:bg-gray-50 transition-colors">
            View Investors
          </Link>
          <Link href="/analytics" className="neo-border px-6 py-3 font-bold bg-white hover:bg-gray-50 transition-colors">
            Analytics
          </Link>
        </div>
      </div>
    </div>
  )
}
