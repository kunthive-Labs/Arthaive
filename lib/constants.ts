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

export const APP_NAME = "Arthaive"
export const APP_DESCRIPTION = "India's open startup funding intelligence platform"
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://arthaive.kunthive.in"


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
  title: "Arthaive — Indian Startup Funding Intelligence",
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


export const EXPORT_FORMATS = [
  { label: "CSV", value: "csv" as const },
  { label: "JSON", value: "json" as const },
  { label: "Excel", value: "xlsx" as const },
] as const


export const COMPARE_MAX = 3


export const CITY_COORDINATES: Record<string, [number, number]> = {
  "Bengaluru": [12.97, 77.59],
  "Mumbai": [19.07, 72.87],
  "Delhi": [28.61, 77.20],
  "Hyderabad": [17.38, 78.48],
  "Chennai": [13.08, 80.27],
  "Pune": [18.52, 73.85],
  "Kolkata": [22.57, 88.36],
  "Ahmedabad": [23.02, 72.57],
}


export const SECTOR_COLORS: Record<string, string> = {
  "Fintech": "#15803d",
  "Edtech": "#1d4ed8",
  "Healthtech": "#7c3aed",
  "SaaS": "#b45309",
  "E-Commerce": "#dc2626",
  "Logistics": "#0891b2",
  "Agritech": "#65a30d",
  "Cleantech": "#0d9488",
  "D2C": "#db2777",
  "Gaming": "#9333ea",
}


export const TREND_WINDOWS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
] as const


export const SHARE_PLATFORMS = [
  { label: "Twitter/X", value: "twitter" as const },
  { label: "LinkedIn", value: "linkedin" as const },
  { label: "WhatsApp", value: "whatsapp" as const },
  { label: "Copy Link", value: "copy" as const },
] as const


export const WEEKLY_DIGEST_DAY = 1
export const SEARCH_DEBOUNCE_MS = 300
export const MAX_BOOKMARKS = 50


export const API_VERSION = "v1"
export const API_BASE = `/api/${API_VERSION}`


export const DEFAULT_CHART_TYPE: "bar" | "line" | "pie" = "bar"


export const FUNDING_STAGES_ORDER = [
  "Pre-Seed", "Seed", "Series A", "Series B",
  "Series C", "Series D", "Pre-IPO", "Bridge", "Debt",
] as const


export const BREAKPOINTS = {
  sm: 640, md: 768, lg: 1024, xl: 1280,
} as const


export const DEFAULT_FILTERS = {
  sector: [] as string[],
  stage: [] as string[],
  location: "",
  search: "",
  page: 1,
  pageSize: 20,
}


export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const


export const DEAL_TABLE_COLUMNS = [
  { key: "company", label: "Company", sortable: true },
  { key: "amount", label: "Amount", sortable: true },
  { key: "stage", label: "Stage", sortable: true },
  { key: "sector", label: "Sector", sortable: false },
  { key: "location", label: "City", sortable: true },
  { key: "date", label: "Date", sortable: true },
] as const
