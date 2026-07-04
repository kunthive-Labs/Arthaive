"use client"

import { useEffect } from "react"
import Link from "next/link"
import { captureException } from "@/lib/sentry"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="border-4 border-black bg-white p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-black text-white px-6 py-3 font-bold border-4 border-black hover:bg-white hover:text-black transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="flex-1 text-center bg-white text-black px-6 py-3 font-bold border-4 border-black hover:bg-gray-50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
