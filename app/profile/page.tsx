import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/supabase/user"
import { getWatchlist, getBookmarks, getSavedSearches, getAlerts } from "@/lib/supabase/profile"

export const metadata = { title: "Profile | India Startup Funding" }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [profile, watchlist, bookmarks, savedSearches, alerts] = await Promise.all([
    getProfile(user.id),
    getWatchlist(user.id),
    getBookmarks(user.id),
    getSavedSearches(user.id),
    getAlerts(user.id),
  ])

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="grid gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="font-semibold mb-4">Account</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{profile?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{profile ? new Date(profile.created_at).toLocaleDateString("en-IN") : "—"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Watchlist", count: watchlist.length },
            { label: "Bookmarks", count: bookmarks.length },
            { label: "Saved Searches", count: savedSearches.length },
            { label: "Active Alerts", count: alerts.filter((a) => a.active).length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
