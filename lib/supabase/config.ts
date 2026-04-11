export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)


export const AUTH_CALLBACK_URL = "/auth/callback"
export const AUTH_REDIRECT_AFTER_LOGIN = "/dashboard"
export const AUTH_REDIRECT_AFTER_LOGOUT = "/"


export const STORAGE_AVATAR_BUCKET = "avatars"
export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024
