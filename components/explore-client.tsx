"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { FilterPanel } from "@/components/filter-panel"
import { DealsList } from "@/components/deals-list"
import { useDeals } from "@/hooks/use-deals"

interface ExploreClientProps {
  sectors: string[]
  locations: string[]
  stages: string[]
  years: string[]
}

const STAGES_DEFAULT = [
  "Pre-Seed", "Seed", "Series A", "Series B", "Series C",
  "Series C+", "Pre-Series A", "Pre-Series B", "Bridge", "Debt",
]

const FUNDING_MIN = 0
const FUNDING_MAX = 10000

export function ExploreClient({ sectors, locations, stages, years }: ExploreClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state FROM the URL so a refresh / back-button / shared link
  // restores the exact view. Lazy initializers read the query string once on
  // mount; thereafter the URL is kept in sync the other way (see effect below).
  const [selectedSectors,  setSelectedSectors]  = useState<string[]>(() => searchParams.getAll("sector"))
  const [selectedStages,   setSelectedStages]   = useState<string[]>(() => searchParams.getAll("stage"))
  const [selectedLocation, setSelectedLocation] = useState<string>(() => searchParams.get("location") ?? "")
  const [selectedYears,    setSelectedYears]    = useState<string[]>(() => searchParams.getAll("year"))
  const [fundingRange,     setFundingRange]     = useState<[number, number]>(() => {
    const min = Number(searchParams.get("min"))
    const max = Number(searchParams.get("max"))
    return [
      Number.isFinite(min) && min > FUNDING_MIN ? min : FUNDING_MIN,
      Number.isFinite(max) && max > FUNDING_MIN && max < FUNDING_MAX ? max : FUNDING_MAX,
    ]
  })
  const [searchQuery,      setSearchQuery]      = useState<string>(() => searchParams.get("search") ?? "")
  const [investorSearch,   setInvestorSearch]   = useState<string>(() => searchParams.get("investor") ?? "")
  const [sortBy,           setSortBy]           = useState<"date" | "amount">(() =>
    searchParams.get("sort") === "amount" ? "amount" : "date")
  const [showUndisclosed,  setShowUndisclosed]  = useState<boolean>(() => searchParams.get("undisclosed") !== "false")
  const [page,             setPage]             = useState<number>(() => {
    const p = Number(searchParams.get("page"))
    return Number.isFinite(p) && p > 1 ? p : 1
  })

  const { deals, loading, error, total, totalPages, refetch } = useDeals()

  // Latest-request guard. Every fired search bumps this id and the in-flight
  // promise carries its own captured id; only the newest is allowed to drive
  // any post-resolution work. Combined with the debounce (whose cleanup cancels
  // a superseded timer before it ever fires), this means we never start two
  // fetches off the same rapid burst of filter changes, and a slow earlier
  // response that lands after a newer one is recognised as stale and dropped.
  const requestIdRef = useRef(0)

  const runSearch = useCallback(() => {
    const requestId = ++requestIdRef.current
    void refetch({
      search: searchQuery,
      investorSearch,
      sectors: selectedSectors,
      stages: selectedStages,
      location: selectedLocation,
      years: selectedYears,
      // Slider is in ₹Cr; amount_inr is stored in lakhs (1 Cr = 100 lakhs).
      // Convert here or every range filter is off by 100×.
      minAmount: fundingRange[0] > FUNDING_MIN ? fundingRange[0] * 100 : undefined,
      maxAmount: fundingRange[1] < FUNDING_MAX ? fundingRange[1] * 100 : undefined,
      showUndisclosed,
      sortBy,
      page,
      limit: 20,
    }).catch(() => {
      // A stale rejection from a superseded request must not surface to the
      // user; only the latest request's outcome is meaningful here.
      if (requestId !== requestIdRef.current) return
    })
  }, [
    searchQuery, investorSearch, selectedSectors, selectedStages,
    selectedLocation, selectedYears, fundingRange, showUndisclosed,
    sortBy, page, refetch,
  ])

  // Keep the URL in sync with the current filter + page state so the view is
  // shareable and survives refresh / back. router.replace (not push) avoids
  // polluting history on every keystroke; scroll:false keeps the list put.
  // Backward-compatible with /explore?sector=...&from=analytics deep links:
  // unknown params like `from` are simply not re-emitted, and the canonical
  // keys (sector/stage/year/location/search) match the inbound link shape.
  useEffect(() => {
    const params = new URLSearchParams()
    selectedSectors.forEach((s) => params.append("sector", s))
    selectedStages.forEach((s) => params.append("stage", s))
    selectedYears.forEach((y) => params.append("year", y))
    if (selectedLocation) params.set("location", selectedLocation)
    if (searchQuery) params.set("search", searchQuery)
    if (investorSearch) params.set("investor", investorSearch)
    if (fundingRange[0] > FUNDING_MIN) params.set("min", String(fundingRange[0]))
    if (fundingRange[1] < FUNDING_MAX) params.set("max", String(fundingRange[1]))
    if (sortBy !== "date") params.set("sort", sortBy)
    if (!showUndisclosed) params.set("undisclosed", "false")
    if (page > 1) params.set("page", String(page))

    const qs = params.toString()
    router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false })
  }, [
    selectedSectors, selectedStages, selectedLocation, selectedYears,
    fundingRange, searchQuery, investorSearch, sortBy, showUndisclosed,
    page, router,
  ])

  // Reset to page 1 whenever a filter (but not the page itself) changes, so a
  // narrowed result set never lands the user on an out-of-range page. This runs
  // before the debounced fetch effect; the fetch reads the just-reset `page`,
  // so query and page stay atomic — no separate fire from a stale page value.
  const isFirstFilterRun = useRef(true)
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false
      return
    }
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectors, selectedStages, selectedLocation, selectedYears, fundingRange, searchQuery, investorSearch, sortBy, showUndisclosed])

  // Debounce the fetch: runSearch's deps include the free-text search boxes, so
  // an un-debounced effect fired one request per keystroke. With the 60 req/min
  // API rate limit that locks an active user out fast (the lockout then surfaced
  // as an empty result). Collapsing rapid changes into one trailing request
  // keeps interactive filtering well under the limit. Because runSearch closes
  // over the latest filter AND page, the trailing call is always atomic.
  useEffect(() => {
    const t = setTimeout(runSearch, 350)
    return () => clearTimeout(t)
  }, [runSearch])

  const clearFilters = () => {
    setSelectedSectors([])
    setSelectedStages([])
    setSelectedLocation("")
    setSelectedYears([])
    setFundingRange([FUNDING_MIN, FUNDING_MAX])
    setSearchQuery("")
    setInvestorSearch("")
    setShowUndisclosed(true)
    setPage(1)
  }

  const displayStages = stages.length > 0 ? stages : STAGES_DEFAULT

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="py-8 md:py-12 border-b-4 border-black">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">EXPLORE DEALS</h1>
          <p className="text-gray-600 mt-2">Browse and filter the Indian startup funding landscape</p>
        </div>

        <div className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-border px-4 py-3 text-sm font-semibold bg-white w-full focus:outline-none focus:ring-2 focus:ring-green-700"
            />
            <input
              type="text"
              placeholder="Search investors..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="neo-border px-4 py-3 text-sm font-semibold bg-white w-full focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8">
          <FilterPanel
            sectors={sectors}
            stages={displayStages}
            locations={locations}
            years={years}
            selectedSectors={selectedSectors}
            setSelectedSectors={setSelectedSectors}
            selectedStages={selectedStages}
            setSelectedStages={setSelectedStages}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            selectedYears={selectedYears}
            setSelectedYears={setSelectedYears}
            fundingRange={fundingRange}
            setFundingRange={setFundingRange}
            showUndisclosed={showUndisclosed}
            setShowUndisclosed={setShowUndisclosed}
          />

          <div className="md:col-span-3">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-4 border-b-2 border-gray-300">
              <p className="text-sm font-semibold text-gray-600">
                {loading ? "LOADING..." : error ? "COULDN'T LOAD DEALS" : `SHOWING ${total} DEALS`}
              </p>
              <div className="flex gap-4 items-center">
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-green-700 hover:underline"
                >
                  CLEAR ALL FILTERS
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
                  className="border-3 border-black px-3 py-2 min-h-[44px] font-bold bg-white text-black text-sm cursor-pointer"
                >
                  <option value="date">Sort: Newest</option>
                  <option value="amount">Sort: Highest Amount</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-4 border-gray-200 p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 w-2/3 mb-3" />
                    <div className="h-4 bg-gray-100 w-1/3 mb-2" />
                    <div className="h-4 bg-gray-100 w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="neo-border p-12 text-center bg-white">
                <p className="text-gray-900 font-bold mb-2">{error.message}</p>
                {error.kind === "auth" ? (
                  <a
                    href="/"
                    className="inline-block mt-2 border-4 border-black px-4 py-2 font-bold text-sm hover:bg-black hover:text-white transition-colors"
                  >
                    SIGN IN
                  </a>
                ) : (
                  <button
                    onClick={runSearch}
                    className="mt-2 border-4 border-black px-4 py-2 font-bold text-sm hover:bg-black hover:text-white transition-colors"
                  >
                    RETRY
                  </button>
                )}
              </div>
            ) : (
              <DealsList deals={deals} />
            )}

            {!loading && totalPages > 1 && (
              <div className="flex gap-2 justify-center mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-4 border-black px-4 py-2 min-h-[44px] font-bold text-sm disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
                >
                  PREV
                </button>
                <span className="border-4 border-black px-4 py-2 min-h-[44px] flex items-center font-bold text-sm bg-black text-white">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-4 border-black px-4 py-2 min-h-[44px] font-bold text-sm disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
