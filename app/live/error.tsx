"use client"

import { useEffect } from "react"
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
        <h2 className="text-2xl font-bold mb-4">Live feed failed to load</h2>
        <p className="text-gray-600 mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="bg-black text-white px-6 py-3 font-bold border-4 border-black hover:bg-white hover:text-black transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
