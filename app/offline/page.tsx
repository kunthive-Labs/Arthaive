"use client"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-center px-4">
      <div className="border-4 border-black bg-white p-10 max-w-sm w-full">
        <div className="text-6xl mb-4 select-none">—</div>
        <h1 className="text-2xl font-bold mb-2">You're offline</h1>
        <p className="text-gray-600 text-sm mb-6">
          Check your connection and try again. Your bookmarks and saved searches are still available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="neo-border w-full px-6 py-3 font-bold bg-green-700 text-white hover:bg-green-800 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
