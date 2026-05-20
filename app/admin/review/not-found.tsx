import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ReviewNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Review item not found</h2>
      <p className="text-muted-foreground text-sm">This item may have already been reviewed or doesn&apos;t exist.</p>
      <Button asChild variant="outline">
        <Link href="/admin/review">Back to Review Queue</Link>
      </Button>
    </div>
  )
}
