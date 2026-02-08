export default function DealLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded" />)}
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}
