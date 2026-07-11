import { getMonthlyUsage } from "@/lib/ai/usage-logger"
import { monthlyBudgetUsd } from "@/lib/ai/budget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "AI Usage | Admin | Arthaive",
}

function fmtUsd(n: number): string {
  return n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`
}

export default async function AIUsagePage() {
  const { totalCostUsd, rows } = await getMonthlyUsage(30)
  const budget = monthlyBudgetUsd()
  const pct = Math.min(100, (totalCostUsd / budget) * 100)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">AI usage</h1>
        <p className="text-sm text-gray-500 mt-1">
          Claude API spend over the last 30 days. Budget alarm at ${budget.toFixed(0)}/month
          (set via AI_MONTHLY_BUDGET_USD).
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">30-day spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmtUsd(totalCostUsd)}</div>
          <div className="text-xs text-gray-500 mt-1">
            of ${budget.toFixed(0)} monthly budget
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded">
            <div
              className={`h-full rounded ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By use case</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500 text-center">
              No AI calls logged yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Use case</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Calls</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Cached</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Input tokens</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Output tokens</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.useCase} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium">{r.useCase}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.totalCalls}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{r.cachedCalls}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.inputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.outputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtUsd(r.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
