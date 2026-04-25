import type { AuthError } from "@supabase/supabase-js"

export function isAuthError(err: unknown): err is AuthError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err
  )
}

export function getAuthErrorMessage(err: unknown): string {
  if (isAuthError(err)) {
    switch (err.code) {
      case "invalid_credentials": return "Invalid login credentials."
      case "user_not_found": return "No account found."
      case "email_not_confirmed": return "Confirm your email first."
      default: return err.message
    }
  }
  return "An unexpected error occurred."
}


export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "invalid_credentials",
  USER_NOT_FOUND: "user_not_found",
  SESSION_EXPIRED: "session_expired",
  RATE_LIMITED: "over_email_send_rate_limit",
} as const


export class AuthSessionExpiredError extends Error {
  constructor() {
    super("Session expired. Please sign in again.")
    this.name = "AuthSessionExpiredError"
  }
}


export function shouldRetry(err: unknown): boolean {
  if (!isAuthError(err)) return false
  return !["invalid_credentials","user_not_found"].includes((err as import("@supabase/supabase-js").AuthError).code ?? "")
}
