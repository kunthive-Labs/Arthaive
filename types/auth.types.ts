import type { User, Session } from "@supabase/supabase-js"

export type { User, Session }

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}


export function isAuthenticated(user: User | null): user is User {
  return user !== null
}


export type UserRole = "viewer" | "contributor" | "admin"

export interface UserWithRole extends UserProfile {
  role: UserRole
}


export interface DashboardStats {
  bookmarkCount: number
  watchlistCount: number
  savedSearchCount: number
  activeAlertCount: number
}


export interface NotificationPreferences {
  emailAlerts: boolean
  weeklyDigest: boolean
  newDealToast: boolean
}


export type DateRange = {
  from: string
  to: string
}

export type ChartGrouping = "day" | "week" | "month" | "quarter" | "year"


export interface ChartAnnotation {
  date: string
  label: string
  color?: string
}


export interface SectorFilter {
  sectors: string[]
  excludeSectors: string[]
  minDealCount: number
}


export type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY"


export interface RealtimeDealEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: Record<string, unknown>
  old: Record<string, unknown>
  timestamp: string
}


export interface LiveFeedFilters {
  sector?: string
  stage?: string
  minAmount?: number
  paused: boolean
}


export interface LiveFeedState {
  deals: import("@/data/funding-data").FundingDeal[]
  connected: boolean
  paused: boolean
  totalReceived: number
}


export interface FeedEventCounters {
  today: number
  thisWeek: number
  thisMonth: number
}


export type SortField = "date" | "amount" | "company" | "stage" | "location"
export type SortDirection = "asc" | "desc"

export interface SortState {
  field: SortField
  direction: SortDirection
}


export interface SchemaOrgOrganization {
  "@type": "Organization"
  name: string
  url?: string
  description?: string
}

export interface SchemaOrgFinancialTransaction {
  "@type": "MoneyTransfer"
  amount: string
  currency: "INR"
  sender: SchemaOrgOrganization
}


export const AVATAR_SIZES = [32, 64, 128] as const
export type AvatarSize = (typeof AVATAR_SIZES)[number]


export interface AppNotification {
  id: string
  type: "success" | "error" | "info" | "deal"
  title: string
  description?: string
  duration?: number
}
