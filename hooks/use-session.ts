"use client"

import { authClient } from "@/lib/auth-client"

export function useSession() {
  const { data, isPending, error, refetch } = authClient.useSession()
  return {
    session: data?.session ?? null,
    user: data?.user ?? null,
    loading: isPending,
    error,
    refetch,
  }
}
