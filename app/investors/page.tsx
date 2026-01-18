import { Header } from "@/components/header"
import { InvestorCard } from "@/components/investor-card"
import { getTopInvestors } from "@/lib/db/investors"

export const metadata = {
  title: "Investors | IndiaFundTrack",
  description: "Discover India's most active startup investors — VCs, angels, and corporate funds.",
}

export default async function InvestorsPage() {
  const investors = await getTopInvestors(100)

  const vcs = investors.filter((i) => i.type === "VC")
  const angels = investors.filter((i) => i.type === "Angel")
  const others = investors.filter((i) => i.type !== "VC" && i.type !== "Angel")

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="py-8 md:py-12 border-b-4 border-black">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">INVESTORS</h1>
          <p className="text-gray-600 mt-2">
            {investors.length} active investors tracked across {investors.reduce((s, i) => s + i.dealCount, 0)} deals
          </p>
        </div>

        <div className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="neo-border p-5 bg-white">
              <div className="text-2xl font-bold text-green-700">{investors.length}</div>
              <div className="text-xs font-bold uppercase text-gray-600 mt-1">Total Investors</div>
            </div>
            <div className="neo-border p-5 bg-white">
              <div className="text-2xl font-bold text-green-700">{vcs.length}</div>
              <div className="text-xs font-bold uppercase text-gray-600 mt-1">VC Firms</div>
            </div>
            <div className="neo-border p-5 bg-white">
              <div className="text-2xl font-bold text-green-700">{angels.length}</div>
              <div className="text-xs font-bold uppercase text-gray-600 mt-1">Angel Investors</div>
            </div>
            <div className="neo-border p-5 bg-white">
              <div className="text-2xl font-bold text-green-700">{investors[0]?.dealCount || 0}</div>
              <div className="text-xs font-bold uppercase text-gray-600 mt-1">Most Active (deals)</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 pb-3 border-b-2 border-black">TOP INVESTORS BY DEAL COUNT</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {investors.map((investor, i) => (
              <InvestorCard key={investor.id} investor={investor} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
