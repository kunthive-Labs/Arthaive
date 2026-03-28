import { ChartSkeleton } from "./chart-skeleton"
import { ChartEmpty } from "./chart-empty"

interface ChartWrapperProps {
  title: string
  description?: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  height?: number
  children: React.ReactNode
}

export function ChartWrapper({
  title,
  description,
  loading,
  empty,
  emptyMessage,
  height = 288,
  children,
}: ChartWrapperProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {loading ? (
        <ChartSkeleton height={height} />
      ) : empty ? (
        <ChartEmpty message={emptyMessage} />
      ) : (
        children
      )}
    </div>
  )
}
