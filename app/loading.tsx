export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-black border-t-green-700 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-gray-800 uppercase tracking-widest">IndiaFundTrack</p>
        <p className="text-xs text-gray-400 mt-1">Loading deals...</p>
      </div>
    </div>
  )
}
