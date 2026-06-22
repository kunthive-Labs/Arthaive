import { getMonthlyUsage } from "@/lib/ai/usage-logger"

/**
 * Enforced month-to-date spend ceiling for Anthropic calls.
 *
 * `usage-logger.getMonthlyUsage()` is read-only observability; this module turns
 * it into an ENFORCED guard. Every paid Claude call site must `await assertWithinBudget()`
 * BEFORE issuing the request so a runaway/abusive load cannot drive unbounded spend.
 *
 * Ceiling is read from `AI_MONTHLY_BUDGET_USD` (USD, rolling 30-day window) with a
 * conservative default. Set the env var in deployment to tune it.
 */

const DEFAULT_MONTHLY_BUDGET_USD = 50

/** Resolve the configured ceiling, falling back to the safe default. */
export function monthlyBudgetUsd(): number {
  const raw = process.env.AI_MONTHLY_BUDGET_USD
  if (!raw) return DEFAULT_MONTHLY_BUDGET_USD
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MONTHLY_BUDGET_USD
  return parsed
}

/**
 * Thrown when the rolling-30-day Anthropic spend has reached the configured ceiling.
 * `status = 429` so route handlers can map it directly to an HTTP response.
 */
export class BudgetExceededError extends Error {
  readonly status = 429
  readonly spentUsd: number
  readonly budgetUsd: number

  constructor(spentUsd: number, budgetUsd: number) {
    super(
      `AI monthly budget exceeded: $${spentUsd.toFixed(2)} of $${budgetUsd.toFixed(
        2,
      )} (rolling 30 days). Set AI_MONTHLY_BUDGET_USD to adjust.`,
    )
    this.name = "BudgetExceededError"
    this.spentUsd = spentUsd
    this.budgetUsd = budgetUsd
  }
}

export function isBudgetExceededError(err: unknown): err is BudgetExceededError {
  return err instanceof BudgetExceededError
}

/**
 * Throws `BudgetExceededError` when month-to-date spend has reached the ceiling.
 *
 * Fails CLOSED: if the spend lookup itself errors we cannot prove we're under
 * budget, so we refuse the call rather than risk unbounded spend. (A configured
 * ceiling of 0 is treated as the safe default, never as "block everything".)
 */
export async function assertWithinBudget(): Promise<void> {
  const budget = monthlyBudgetUsd()
  let spent: number
  try {
    const usage = await getMonthlyUsage(30)
    spent = usage.totalCostUsd
  } catch (err) {
    console.error("[ai budget] spend lookup failed — failing closed:", err)
    throw new BudgetExceededError(Number.POSITIVE_INFINITY, budget)
  }
  if (spent >= budget) {
    throw new BudgetExceededError(spent, budget)
  }
}
