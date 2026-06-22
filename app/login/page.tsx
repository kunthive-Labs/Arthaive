import { redirect } from "next/navigation"

// The sign-in gate now lives at "/". Keep this route as a permanent redirect so
// old links and the OAuth flow land in one place.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  redirect(error ? `/?error=${error}` : "/")
}
