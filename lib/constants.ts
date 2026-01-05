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


export const AMOUNT_RANGES = [
  { label: "Any", min: 0, max: Infinity },
  { label: "< ₹1Cr", min: 0, max: 100 },
  { label: "₹1–10Cr", min: 100, max: 1000 },
  { label: "₹10–100Cr", min: 1000, max: 10000 },
  { label: "> ₹100Cr", min: 10000, max: Infinity },
] as const


export const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Investors", href: "/investors" },
  { label: "Analytics", href: "/analytics" },
  { label: "Submit Deal", href: "/submit" },
] as const


export const META_DEFAULTS = {
  title: "IndiaFundTrack — Indian Startup Funding Intelligence",
  description: "Discover, analyze and track startup funding across India. 1600+ deals, 200+ investors, real-time insights.",
  keywords: ["startup", "funding", "india", "vc", "angel", "seed", "series a"],
} as const


export const DATE_FORMATS = {
  display: { day: "numeric" as const, month: "long" as const, year: "numeric" as const },
  short: { day: "numeric" as const, month: "short" as const },
  monthYear: { month: "long" as const, year: "numeric" as const },
} as const


export const FISCAL_QUARTERS: Record<string, { label: string; months: number[] }> = {
  Q1: { label: "Q1 (Apr–Jun)", months: [3, 4, 5] },
  Q2: { label: "Q2 (Jul–Sep)", months: [6, 7, 8] },
  Q3: { label: "Q3 (Oct–Dec)", months: [9, 10, 11] },
  Q4: { label: "Q4 (Jan–Mar)", months: [0, 1, 2] },
}
