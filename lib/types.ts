export interface Deal {
  id: string
  company: string
  companyUrl: string
  amount: number
  amountUsd: number
  stage: string
  sectors: string[]
  investors: string[]
  leadInvestor: string
  date: string
  location: string
  description: string
  sourceUrl: string
  weekFolder: string
}

export interface Investor {
  id: string
  name: string
  slug: string
  type: "VC" | "Angel" | "Corporate" | "Family Office" | "Government" | "Other"
  website?: string
  dealCount: number
  totalDeployed: number
  sectors: string[]
  stages: string[]
  cities: string[]
  deals?: Deal[]
}

export interface Sector {
  id: string
  name: string
  slug: string
  dealCount: number
  totalFunding: number
  avgDealSize: number
  topStages: string[]
  topCities: string[]
}

export interface DealFilters {
  search?: string
  investorSearch?: string
  sectors?: string[]
  stages?: string[]
  location?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
  years?: string[]
  showUndisclosed?: boolean
  sortBy?: "date" | "amount"
  page?: number
  limit?: number
}

export interface PaginatedDeals {
  deals: Deal[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SiteStats {
  totalDeals: number
  totalDisclosedFunding: number
  disclosedDealsCount: number
  topSector: string
  topSectorCount: number
  largestDealCompany: string
  largestDealAmount: number
  uniqueInvestors: number
  uniqueCities: number
  uniqueSectors: number
  lastUpdated: string
}

export interface MonthlyFunding {
  month: string
  totalFunding: number
  dealCount: number
  avgDealSize: number
}

export interface SectorStat {
  sector: string
  dealCount: number
  totalFunding: number
  avgDealSize: number
  percentage: number
}

export interface CityFunding {
  city: string
  dealCount: number
  totalFunding: number
}

export interface StageStat {
  stage: string
  count: number
  percentage: number
  totalFunding: number
}

export interface DealSubmission {
  company: string
  companyUrl?: string
  amount?: number
  amountCurrency: "INR" | "USD"
  stage: string
  sectors: string[]
  investors: string[]
  city: string
  date: string
  sourceUrl: string
  submittedBy?: string
}


export interface FilterChip {
  label: string
  key: string
  value?: string
}


export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}


export interface InvestorFilter {
  type?: string
  minDeals?: number
  sector?: string
  stage?: string
}


export interface SearchResult {
  deals: Deal[]
  investors: Investor[]
  total: number
  query: string
}


export type SortOrder = "asc" | "desc"

export interface SortConfig {
  field: string
  order: SortOrder
}


export interface NavItem {
  label: string
  href: string
  active?: boolean
}


export interface WeeklyDigest {
  weekFolder: string
  dealCount: number
  totalFunding: number
  topDeal: Deal
  topSectors: string[]
  dateRange: { from: string; to: string }
}


export interface UserPreferences {
  savedSearches: DealFilters[]
  watchedSectors: string[]
  watchedInvestors: string[]
}


export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  meta?: Record<string, unknown>
}


export interface ToastMessage {
  id: string
  type: "success" | "error" | "info"
  message: string
  duration?: number
}


export type ExportFormat = "csv" | "json" | "xlsx"

export interface ExportOptions {
  format: ExportFormat
  fields?: string[]
  filename?: string
}


export interface CompareResult {
  metricA: number
  metricB: number
  delta: number
  pctChange: number
}


export interface TrendPoint {
  date: string
  value: number
  label?: string
}

export type TrendSeries = TrendPoint[]


export interface SectorStats {
  sector: string
  dealCount: number
  totalFunding: number
  avgDealSize: number
  topStage: string
}


export interface CityStats {
  city: string
  dealCount: number
  totalFunding: number
  topSector: string
}


export interface WeeklyStats {
  week: string
  dealCount: number
  totalFunding: number
  sectors: string[]
}


export interface SearchSuggestion {
  type: "company" | "sector" | "investor" | "location"
  label: string
  value: string
  count?: number
}


export interface BookmarkItem {
  id: string
  type: "deal" | "investor"
  savedAt: string
}


export interface SharePayload {
  url: string
  title: string
  text?: string
  platform?: "twitter" | "linkedin" | "whatsapp" | "copy"
}
