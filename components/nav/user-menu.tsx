import { getAuthUser } from "@/lib/auth/server"
import { getProfile } from "@/lib/supabase/user"
import { UserAvatar } from "@/components/auth/user-avatar"
import { SignInButton } from "@/components/auth/sign-in-button"

export async function UserMenu() {
  const user = await getAuthUser()

  if (!user) {
    return (
      <div className="w-36">
        <SignInButton />
      </div>
    )
  }

  const profile = await getProfile(user.id)

  return (
    <UserAvatar
      name={profile?.full_name ?? user.name ?? null}
      email={profile?.email ?? user.email}
      avatarUrl={profile?.avatar_url ?? user.image ?? null}
    />
  )
}
