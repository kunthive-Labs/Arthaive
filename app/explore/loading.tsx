export default function ExploreLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 animate-pulse">
      <div className="h-10 bg-gray-200 w-72 mb-2" />
      <div className="h-4 bg-gray-100 w-96 mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="h-12 border-4 border-gray-200 bg-gray-50" />
        <div className="h-12 border-4 border-gray-200 bg-gray-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filter panel skeleton */}
        <div className="border-4 border-gray-200 p-6 h-fit">
          <div className="h-5 bg-gray-200 w-24 mb-6" />
          {[...Array(4)].map((_, section) => (
            <div key={section} className="mb-8 pb-6 border-b-2 border-gray-100">
              <div className="h-4 bg-gray-200 w-20 mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, row) => (
                  <div key={row} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200" />
                    <div className="h-4 bg-gray-100 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Deal-card skeletons */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border-4 border-gray-200 p-6">
                <div className="h-5 bg-gray-200 w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 w-1/3 mb-2" />
                <div className="h-4 bg-gray-100 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
