/**
 * Allow-list for remote avatar hosts.
 *
 * This MUST stay in sync with `images.remotePatterns` in next.config.mjs.
 *
 * Two things depend on it, for two different reasons:
 *
 *  1. Correctness. Vercel's image optimizer answers 400 for any host that is
 *     not in `remotePatterns`. `avatar_url` is user-supplied (PATCH
 *     /api/profile) and `user.image` comes from the OAuth provider, so without
 *     a matching check here a stale or foreign URL renders as a broken image
 *     rather than degrading to the initials placeholder.
 *
 *  2. Security. The optimizer fetches the URL server-side. Allowing arbitrary
 *     attacker-chosen origins would turn it into a fetch proxy, so the write
 *     path is bounded to the same hosts the read path can render.
 *
 * Under the previous Cloudflare deployment `images.unoptimized` was true, so
 * every URL rendered directly and this mismatch was invisible. Re-enabling
 * optimization on Vercel makes it load-bearing.
 */

/** Google account photos, set on `user.image` by Better Auth's Google provider. */
const ALLOWED_AVATAR_HOSTS = new Set(["lh3.googleusercontent.com"])

/** Supabase Storage public URLs, written by lib/supabase/storage.ts. */
const ALLOWED_AVATAR_HOST_SUFFIXES = [".supabase.co"]

export function isAllowedAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  // https only: the optimizer's remotePatterns entries are https, and an
  // http avatar would be mixed content on an HSTS origin anyway.
  if (url.protocol !== "https:") return false

  const host = url.hostname.toLowerCase()
  if (ALLOWED_AVATAR_HOSTS.has(host)) return true
  return ALLOWED_AVATAR_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

/**
 * Narrow a stored avatar URL to one that is actually renderable.
 *
 * Returns null for anything off the allow-list so callers fall through to
 * their placeholder. Legacy rows written before the allow-list existed lose
 * their avatar instead of showing a broken image.
 */
export function resolveAvatarUrl(value: string | null | undefined): string | null {
  return isAllowedAvatarUrl(value) ? (value as string) : null
}
