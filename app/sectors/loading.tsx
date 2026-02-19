export default function SectorsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-80 mb-10" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded" />)}
      </div>
    </div>
  )
}
