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
