"use client"

import { Header } from "@/components/header"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FundingTrendLine } from "@/components/charts/funding-trend-line"
import { SectorBarChart } from "@/components/charts/sector-bar-chart"
import { StageFunnel } from "@/components/charts/stage-funnel"
import { BubbleChart } from "@/components/charts/bubble-chart"
import { FundingHeatmap } from "@/components/charts/funding-heatmap"
import { SankeyDiagram } from "@/components/charts/sankey-diagram"
import { IndiaMap } from "@/components/charts/india-map"
import { YoYComparison } from "@/components/charts/yoy-comparison"
import { DealVelocity } from "@/components/charts/deal-velocity"
import type { FundingDeal } from "@/data/funding-data"
import type { Deal } from "@/lib/types"

const TOP_SECTORS = [
  "Fintech", "Edtech", "Healthtech", "SaaS", "EV", "Logistics",
  "D2C", "Agritech", "Deeptech", "Gaming",
]

interface AnalyticsClientProps {
  deals: Deal[]
}

export function AnalyticsClient({ deals }: AnalyticsClientProps) {
  // Deal from lib/types is structurally compatible with FundingDeal from the data file.
  // Both have: amount, date, sectors, stage, location, investors, company, id.
  // The cast is safe — Deal has a superset of FundingDeal fields.
  const fd = deals as unknown as FundingDeal[]

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="pb-6 border-b-4 border-black mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">ANALYTICS</h1>
          <p className="text-gray-600 mt-2">Trends, insights, and patterns in Indian startup funding</p>
          <p className="text-xs text-gray-400 mt-1">{deals.length.toLocaleString()} verified records</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deepdive">Deep Dive</TabsTrigger>
            <TabsTrigger value="flow">Money Flow</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="compare">Year-on-Year</TabsTrigger>
            <TabsTrigger value="velocity">Sector Velocity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Monthly Funding Volume</h2>
              <FundingTrendLine deals={fd} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Top 15 Sectors by Total Funding</h2>
              <SectorBarChart deals={fd} topN={15} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Deal Count by Stage</h2>
              <StageFunnel deals={fd} />
            </div>
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="deepdive" className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-2">Sector Bubble Chart</h2>
              <p className="text-sm text-muted-foreground mb-4">
                X = deal count · Y = average deal size · Bubble size = total funding
              </p>
              <BubbleChart deals={fd} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Funding Heatmap (Month × Sector)</h2>
              <FundingHeatmap deals={fd} topSectors={12} />
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-2">Investor → Sector Money Flow</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Top 10 lead investors funding top 8 sectors
              </p>
              <SankeyDiagram deals={fd} topInvestors={10} topSectors={8} />
            </div>
          </TabsContent>

          <TabsContent value="geography">
            <div>
              <h2 className="text-lg font-semibold mb-4">Funding by City</h2>
              <IndiaMap deals={fd} />
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <div>
              <h2 className="text-lg font-semibold mb-4">Year-on-Year Monthly Comparison</h2>
              <YoYComparison deals={fd} />
            </div>
          </TabsContent>

          <TabsContent value="velocity">
            <div>
              <h2 className="text-lg font-semibold mb-4">Sector Deal Velocity (rolling 16 weeks)</h2>
              <DealVelocity deals={fd} sectors={TOP_SECTORS} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
