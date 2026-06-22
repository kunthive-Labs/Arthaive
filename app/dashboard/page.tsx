import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getBookmarks, getWatchlist, getSavedSearches, getAlerts } from "@/lib/supabase/profile"
import { Header } from "@/components/header"
import { HeroStats } from "@/components/hero-stats"
import { RecentDealsSection } from "@/components/recent-deals-section"
import { QuickInsights } from "@/components/quick-insights"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Bookmark, Bell, Search, Star, LayoutGrid, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard | Arthaive" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [bookmarks, watchlist, savedSearches, alerts] = await Promise.all([
    getBookmarks(user.id),
    getWatchlist(user.id),
    getSavedSearches(user.id),
    getAlerts(user.id),
  ])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 md:px-6 md:py-16">
        {/* The funding-intelligence dashboard: headline stats, recent deals, insights */}
        <HeroStats />
        <RecentDealsSection />
        <QuickInsights />

        {/* The signed-in user's own workspace */}
        <section className="mt-16 pt-8 border-t-4 border-black">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">YOUR WORKSPACE</h2>

          <Link
            href="/dashboard/custom"
            className="group mb-8 flex items-center justify-between gap-4 neo-border bg-[#1A5D1A] p-5 text-white shadow-[4px_4px_0_#000] transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <LayoutGrid className="h-7 w-7 shrink-0" />
              <div>
                <p className="text-lg font-bold tracking-tight">Build a custom dashboard</p>
                <p className="text-sm text-white/70">
                  Drag, resize, and filter analytics widgets into your own private views.
                </p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>

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
                <EmptyState message="No bookmarks yet. Bookmark deals from the Explore page to save them here." />
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((b) => (
                    <div key={b.id} className="neo-border p-4 flex justify-between items-center bg-white">
                      <span className="font-mono text-sm text-gray-600">{b.deal_id}</span>
                      <span className="text-xs text-gray-500">
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
                    <div key={w.id} className="neo-border p-4 bg-white">
                      <p className="font-bold">{w.company}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added {new Date(w.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="searches">
              {savedSearches.length === 0 ? (
                <EmptyState message="No saved searches. Save your filter combinations on Explore for quick access." />
              ) : (
                <div className="space-y-2">
                  {savedSearches.map((s) => (
                    <div key={s.id} className="neo-border p-4 flex justify-between items-center bg-white">
                      <span className="font-bold">{s.name}</span>
                      <span className="text-xs text-gray-500">
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
                    <div key={a.id} className="neo-border p-4 flex justify-between items-center bg-white">
                      <div>
                        <span className="font-bold">{a.sector ?? "Any sector"}</span>
                        {a.stage && <span className="text-sm text-gray-600 ml-2">· {a.stage}</span>}
                        {a.min_amount && (
                          <span className="text-sm text-gray-600 ml-2">
                            · ≥₹{a.min_amount} Cr
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 font-bold uppercase ${a.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {a.active ? "Active" : "Paused"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="neo-border border-dashed p-12 text-center bg-white">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
