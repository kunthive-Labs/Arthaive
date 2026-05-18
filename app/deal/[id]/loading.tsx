export default function DealLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-5 bg-gray-200 w-24 mb-4" />
      <div className="h-9 bg-gray-200 w-2/3 mb-2" />
      <div className="h-4 bg-gray-100 w-1/3 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-4 border-gray-200 p-4">
            <div className="h-6 bg-gray-200 w-16 mb-1" />
            <div className="h-3 bg-gray-100 w-20" />
          </div>
        ))}
      </div>
      <div className="border-4 border-gray-200 p-6 mb-6">
        <div className="h-5 bg-gray-200 w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-100" />)}
        </div>
      </div>
    </div>
  )
}
