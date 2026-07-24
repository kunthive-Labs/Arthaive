"use client"

import { authClient } from "@/lib/auth-client"

export function useAuth() {
  const { data, isPending, error, refetch } = authClient.useSession()
  return {
    user: data?.user ?? null,
    loading: isPending,
    error,
    refetch,
  }
}
