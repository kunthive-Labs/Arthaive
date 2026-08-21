import Image from "next/image"
import { User } from "lucide-react"
import type { UserProfile } from "@/types/auth.types"
import { resolveAvatarUrl } from "@/lib/avatar"

export function ProfileCard({ profile }: { profile: UserProfile }) {
  // See lib/avatar.ts — anything outside remotePatterns 400s once the
  // Vercel image optimizer is in play, so degrade to the placeholder.
  const src = resolveAvatarUrl(profile.avatar_url)

  return (
    <div className="flex items-center gap-4 rounded-lg border p-6">
      {src ? (
        <Image
          src={src}
          alt={profile.full_name ?? profile.email}
          width={64}
          height={64}
          className="rounded-full"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="font-semibold text-lg">{profile.full_name ?? "User"}</p>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Member since {new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  )
}
