import type { FundingDeal } from "@/data/funding-data"
import type { CompareResult } from "@/lib/types"

export function compareMetric(a: number, b: number): CompareResult {
  const delta = b - a
  const pctChange = a !== 0 ? (delta / a) * 100 : 0
  return { metricA: a, metricB: b, delta, pctChange }
}

export function compareDeals(dealA: FundingDeal, dealB: FundingDeal): Record<string, CompareResult> {
  return {
    amount: compareMetric(dealA.amount, dealB.amount),
  }
}

export function buildCompareUrl(ids: string[]): string {
  return `/compare?ids=${ids.join(",")}`
}
