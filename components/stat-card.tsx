interface StatCardProps {
  value: string | number
  label: string
  sublabel?: string
  accent?: boolean
}

export function StatCard({ value, label, sublabel, accent = false }: StatCardProps) {
  return (
    <div className="neo-border neo-hover p-6 bg-white">
      <div className={`text-3xl font-bold mb-2 ${accent ? "text-green-700" : "text-black"}`}>
        {value}
      </div>
      <div className="text-xs font-bold uppercase text-gray-600">{label}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    </div>
  )
}
