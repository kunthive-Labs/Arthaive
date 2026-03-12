import Image from "next/image"
import { User } from "lucide-react"
import type { UserProfile } from "@/types/auth.types"

export function ProfileCard({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-6">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
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
