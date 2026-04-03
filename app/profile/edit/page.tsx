import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/user"

export const metadata = { title: "Edit Profile | India Startup Funding" }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfile(user.id)

  return (
    <div className="container py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Display name</label>
          <p className="text-sm text-muted-foreground mt-1">{profile?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Synced from Google. Change via your Google account settings.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="text-sm text-muted-foreground mt-1">{profile?.email}</p>
        </div>
      </div>
    </div>
  )
}
