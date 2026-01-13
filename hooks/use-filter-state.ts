"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

export interface FilterState {
  search: string
  investorSearch: string
  sectors: string[]
  stages: string[]
  location: string
  years: string[]
  minAmount: number
  maxAmount: number
  showUndisclosed: boolean
  sortBy: "date" | "amount"
  page: number
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  investorSearch: "",
  sectors: [],
  stages: [],
  location: "",
  years: [],
  minAmount: 0,
  maxAmount: 100000,
  showUndisclosed: true,
  sortBy: "date",
  page: 1,
}

export function useFilterState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: FilterState = useMemo(() => ({
    search: searchParams.get("search") || "",
    investorSearch: searchParams.get("investor") || "",
    sectors: searchParams.getAll("sector"),
    stages: searchParams.getAll("stage"),
    location: searchParams.get("location") || "",
    years: searchParams.getAll("year"),
    minAmount: Number(searchParams.get("minAmount") || 0),
    maxAmount: Number(searchParams.get("maxAmount") || 100000),
    showUndisclosed: searchParams.get("undisclosed") !== "false",
    sortBy: (searchParams.get("sort") || "date") as "date" | "amount",
    page: Number(searchParams.get("page") || 1),
  }), [searchParams])

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    const params = new URLSearchParams(searchParams.toString())
    const merged = { ...filters, ...updates, page: 1 }

    if ("page" in updates) merged.page = updates.page!

    params.delete("search")
    params.delete("investor")
    params.delete("sector")
    params.delete("stage")
    params.delete("location")
    params.delete("year")
    params.delete("minAmount")
    params.delete("maxAmount")
    params.delete("undisclosed")
    params.delete("sort")
    params.delete("page")

    if (merged.search) params.set("search", merged.search)
    if (merged.investorSearch) params.set("investor", merged.investorSearch)
    merged.sectors.forEach((s) => params.append("sector", s))
    merged.stages.forEach((s) => params.append("stage", s))
    if (merged.location) params.set("location", merged.location)
    merged.years.forEach((y) => params.append("year", y))
    if (merged.minAmount > 0) params.set("minAmount", merged.minAmount.toString())
    if (merged.maxAmount < 100000) params.set("maxAmount", merged.maxAmount.toString())
    if (!merged.showUndisclosed) params.set("undisclosed", "false")
    if (merged.sortBy !== "date") params.set("sort", merged.sortBy)
    if (merged.page > 1) params.set("page", merged.page.toString())

    router.push(`${pathname}?${params.toString()}`)
  }, [filters, pathname, router, searchParams])

  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [pathname, router])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.investorSearch) count++
    count += filters.sectors.length
    count += filters.stages.length
    if (filters.location) count++
    count += filters.years.length
    if (filters.minAmount > 0) count++
    if (filters.maxAmount < 100000) count++
    if (!filters.showUndisclosed) count++
    return count
  }, [filters])

  return { filters, updateFilters, clearFilters, activeFilterCount, DEFAULT_FILTERS }
}
