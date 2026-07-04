import { fundingData } from "@/data/funding-data"

export function QuickInsights() {
  const sectors = Array.from(new Set(fundingData.flatMap((d) => d.sectors)))
  const trendingSectors = sectors
    .map((sector) => ({
      sector,
      count: fundingData.filter((d) => d.sectors.includes(sector)).length,
      totalFunding: fundingData.filter((d) => d.sectors.includes(sector)).reduce((sum, d) => sum + d.amount, 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topInvestors = fundingData
    .flatMap((d) => d.investors.map((inv) => ({ investor: inv, amount: d.amount })))
    .reduce(
      (acc, curr) => {
        const existing = acc.find((x) => x.investor === curr.investor)
        if (existing) {
          existing.deals++
          existing.amount += curr.amount
        } else {
          acc.push({ investor: curr.investor, deals: 1, amount: curr.amount })
        }
        return acc
      },
      [] as Array<{ investor: string; deals: number; amount: number }>,
    )
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 5)

  return (
    <div className="mt-16 pt-8 border-t-4 border-black">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">QUICK INSIGHTS</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="neo-border neo-hover p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-6 text-green-700">Trending Sectors</h3>
          <div className="space-y-3">
            {trendingSectors.map((item) => (
              <div key={item.sector} className="flex justify-between items-center pb-3 border-b-2 border-gray-200">
                <div>
                  <div className="font-bold text-sm">{item.sector}</div>
                  <div className="text-xs text-gray-600">{item.count} deals</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">₹{(item.totalFunding / 100).toFixed(0)}Cr</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="neo-border neo-hover p-8 bg-white">
          <h3 className="text-lg font-bold uppercase mb-6 text-green-700">Most Active Investors</h3>
          <div className="space-y-3">
            {topInvestors.map((item) => (
              <div key={item.investor} className="flex justify-between items-center pb-3 border-b-2 border-gray-200">
                <div>
                  <div className="font-bold text-sm">{item.investor}</div>
                  <div className="text-xs text-gray-600">{item.deals} deals</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">₹{(item.amount / 100).toFixed(0)}Cr</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
