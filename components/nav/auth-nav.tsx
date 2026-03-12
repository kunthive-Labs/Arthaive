import Link from "next/link"
import { Suspense } from "react"
import { UserMenu } from "./user-menu"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthNav() {
  return (
    <nav className="flex items-center gap-4">
      <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Analytics
      </Link>
      <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Explore
      </Link>
      <Link href="/investors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Investors
      </Link>
      <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
        <UserMenu />
      </Suspense>
    </nav>
  )
}
