"use client"
import { useState, useCallback } from "react"
import type { PaginationState } from "@/lib/types"

export function usePagination(total: number, pageSize = 20): PaginationState & { goTo: (p: number) => void; next: () => void; prev: () => void } {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(total / pageSize)
  const goTo = useCallback((p: number) => setPage(Math.min(Math.max(1, p), totalPages || 1)), [totalPages])
  return { page, pageSize, total, totalPages, goTo, next: () => goTo(page + 1), prev: () => goTo(page - 1) }
}
