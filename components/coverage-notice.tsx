interface CoverageNoticeProps {
  earliest: string
  latest: string
  total: number
  className?: string
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

export function CoverageNotice({ earliest, latest, total, className = "" }: CoverageNoticeProps) {
  return (
    <div className={`border-2 border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 ${className}`}>
      <span className="font-bold text-gray-700">DATA COVERAGE</span>
      {" — "}
      {total.toLocaleString()} verified records
      {earliest && latest && (
        <> · {formatDate(earliest)} to {formatDate(latest)}</>
      )}
      {" · "}
      Records before {formatDate(earliest)} may be incomplete.
    </div>
  )
}
