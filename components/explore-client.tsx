"use client"

import { useState, useEffect, useCallback } from "react"
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

export function ExploreClient({ sectors, locations, stages, years }: ExploreClientProps) {
  const [selectedSectors,  setSelectedSectors]  = useState<string[]>([])
  const [selectedStages,   setSelectedStages]   = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [selectedYears,    setSelectedYears]    = useState<string[]>([])
  const [fundingRange,     setFundingRange]     = useState<[number, number]>([0, 10000])
  const [searchQuery,      setSearchQuery]      = useState<string>("")
  const [investorSearch,   setInvestorSearch]   = useState<string>("")
  const [sortBy,           setSortBy]           = useState<"date" | "amount">("date")
  const [showUndisclosed,  setShowUndisclosed]  = useState<boolean>(true)
  const [page,             setPage]             = useState(1)

  const { deals, loading, total, totalPages, refetch } = useDeals({})

  // Initialize filters from URL query params (e.g. linked from /analytics "View data →")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sectorParams = params.getAll("sector")
    const stageParams = params.getAll("stage")
    const yearParams = params.getAll("year")
    const locationParam = params.get("location")
    const searchParam = params.get("search")

    if (sectorParams.length) setSelectedSectors(sectorParams)
    if (stageParams.length) setSelectedStages(stageParams)
    if (yearParams.length) setSelectedYears(yearParams)
    if (locationParam) setSelectedLocation(locationParam)
    if (searchParam) setSearchQuery(searchParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = useCallback(() => {
    refetch({
      search: searchQuery,
      investorSearch,
      sectors: selectedSectors,
      stages: selectedStages,
      location: selectedLocation,
      years: selectedYears,
      minAmount: fundingRange[0] > 0 ? fundingRange[0] : undefined,
      maxAmount: fundingRange[1] < 10000 ? fundingRange[1] : undefined,
      showUndisclosed,
      sortBy,
      page,
      limit: 20,
    })
  }, [
    searchQuery, investorSearch, selectedSectors, selectedStages,
    selectedLocation, selectedYears, fundingRange, showUndisclosed,
    sortBy, page, refetch,
  ])

  useEffect(() => {
    setPage(1)
  }, [selectedSectors, selectedStages, selectedLocation, selectedYears, fundingRange, searchQuery, investorSearch, sortBy, showUndisclosed])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const clearFilters = () => {
    setSelectedSectors([])
    setSelectedStages([])
    setSelectedLocation("")
    setSelectedYears([])
    setFundingRange([0, 10000])
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
                {loading ? "LOADING..." : `SHOWING ${total} DEALS`}
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
                  className="border-3 border-black px-3 py-2 font-bold bg-white text-black text-sm cursor-pointer"
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
            ) : (
              <DealsList deals={deals} />
            )}

            {!loading && totalPages > 1 && (
              <div className="flex gap-2 justify-center mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-4 border-black px-4 py-2 font-bold text-sm disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
                >
                  PREV
                </button>
                <span className="border-4 border-black px-4 py-2 font-bold text-sm bg-black text-white">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-4 border-black px-4 py-2 font-bold text-sm disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
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
