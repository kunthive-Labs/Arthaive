import { SignInButton } from "@/components/auth/sign-in-button"
import { TrendingUp } from "lucide-react"

export const metadata = {
  title: "Sign In | India Startup Funding",
  description: "Sign in to track Indian startup funding deals",
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">India Startup Funding</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track every funding round across Indian startups
          </p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Authentication failed. Please try again.
          </div>
        )}

        <div className="space-y-4">
          <SignInButton />
          <p className="text-center text-xs text-muted-foreground">
            Sign up is only available via Google. No password required.
          </p>
        </div>
      </div>
    </div>
  )
}
