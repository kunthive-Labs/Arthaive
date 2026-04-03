export const metadata = {
  title: "Offline | India Startup Funding",
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-center px-4">
      <div className="text-5xl">📡</div>
      <h1 className="text-2xl font-bold">You're offline</h1>
      <p className="text-muted-foreground max-w-xs">
        Check your connection and try again. Your bookmarks and saved searches are still available.
      </p>
    </div>
  )
}
