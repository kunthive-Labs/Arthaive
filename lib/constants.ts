export const FUNDING_STAGES = [
  "Pre-Seed",
  "Seed",
  "Pre-Series A",
  "Series A",
  "Pre-Series B",
  "Series B",
  "Series C",
  "Series C+",
  "Series D",
  "Bridge",
  "Debt",
  "Grant",
  "IPO",
  "Angel",
] as const

export type FundingStage = (typeof FUNDING_STAGES)[number]

export const INVESTOR_TYPES = ["VC", "Angel", "Corporate", "Family Office", "Government", "Other"] as const

export type InvestorType = (typeof INVESTOR_TYPES)[number]

export const TOP_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Gurugram",
  "Noida",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Kochi",
  "Chandigarh",
  "Indore",
]

export const TOP_SECTORS = [
  "Fintech",
  "Edtech",
  "Healthtech",
  "SaaS",
  "E-Commerce",
  "Logistics",
  "Agritech",
  "Cleantech",
  "D2C",
  "Gaming",
  "Media",
  "Mobility",
  "Real Estate",
  "HR Tech",
  "Legal Tech",
]

export const FISCAL_YEAR_START_MONTH = 3 // April (0-indexed)

export const USD_TO_INR_RATE = 84.5

export const LAKHS_PER_CRORE = 100

export const MAX_DEALS_PER_PAGE = 20

export const APP_NAME = "IndiaFundTrack"
export const APP_DESCRIPTION = "India's open startup funding intelligence platform"
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ind-startup-funding.vercel.app"


export const CHART_COLORS = [
  "#15803d", "#1d4ed8", "#7c3aed", "#b45309",
  "#dc2626", "#0891b2", "#db2777", "#65a30d",
] as const


export const SORT_OPTIONS = [
  { label: "Newest First", value: "date-desc" },
  { label: "Oldest First", value: "date-asc" },
  { label: "Highest Amount", value: "amount-desc" },
  { label: "Lowest Amount", value: "amount-asc" },
] as const


export const PAGINATION_SIZES = [10, 20, 50, 100] as const

export const DEFAULT_PAGE_SIZE = 20
