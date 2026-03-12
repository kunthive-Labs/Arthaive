import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getBookmarks, getWatchlist, getSavedSearches, getAlerts } from "@/lib/supabase/profile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Bell, Search, Star } from "lucide-react"

export const metadata = { title: "Dashboard | India Startup Funding" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [bookmarks, watchlist, savedSearches, alerts] = await Promise.all([
    getBookmarks(user.id),
    getWatchlist(user.id),
    getSavedSearches(user.id),
    getAlerts(user.id),
  ])

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <Tabs defaultValue="bookmarks">
        <TabsList className="mb-6">
          <TabsTrigger value="bookmarks" className="gap-2">
            <Bookmark className="h-4 w-4" /> Bookmarks ({bookmarks.length})
          </TabsTrigger>
          <TabsTrigger value="watchlist" className="gap-2">
            <Star className="h-4 w-4" /> Watchlist ({watchlist.length})
          </TabsTrigger>
          <TabsTrigger value="searches" className="gap-2">
            <Search className="h-4 w-4" /> Saved Searches ({savedSearches.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" /> Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks">
          {bookmarks.length === 0 ? (
            <EmptyState message="No bookmarks yet. Bookmark deals to save them here." />
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b) => (
                <div key={b.id} className="rounded-lg border p-4 flex justify-between items-center">
                  <span className="font-mono text-sm text-muted-foreground">{b.deal_id}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="watchlist">
          {watchlist.length === 0 ? (
            <EmptyState message="No companies watched. Add companies from deal pages." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {watchlist.map((w) => (
                <div key={w.id} className="rounded-lg border p-4">
                  <p className="font-medium">{w.company}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(w.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="searches">
          {savedSearches.length === 0 ? (
            <EmptyState message="No saved searches. Save your filter combinations for quick access." />
          ) : (
            <div className="space-y-2">
              {savedSearches.map((s) => (
                <div key={s.id} className="rounded-lg border p-4 flex justify-between items-center">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {alerts.length === 0 ? (
            <EmptyState message="No alerts configured. Set up alerts to get notified of new deals." />
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-lg border p-4 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{a.sector ?? "Any sector"}</span>
                    {a.stage && <span className="text-sm text-muted-foreground ml-2">· {a.stage}</span>}
                    {a.min_amount && (
                      <span className="text-sm text-muted-foreground ml-2">
                        · ≥₹{a.min_amount} Cr
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${a.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {a.active ? "Active" : "Paused"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
