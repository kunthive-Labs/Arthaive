export default function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 w-56 mb-2" />
      <div className="h-4 bg-gray-100 w-72 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-4 border-gray-200 p-5">
            <div className="h-7 bg-gray-200 w-20 mb-2" />
            <div className="h-4 bg-gray-100 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-4 border-gray-200 p-6 h-72">
            <div className="h-5 bg-gray-200 w-36 mb-4" />
            <div className="h-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
