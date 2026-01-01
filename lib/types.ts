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
