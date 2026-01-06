export default function InvestorsLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-16 border-b-4 border-black" />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="neo-border p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="neo-border p-5 animate-pulse h-40" />
          ))}
        </div>
      </div>
    </div>
  )
}
