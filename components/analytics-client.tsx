"use client"

import { useMemo } from "react"
import { track } from "@vercel/analytics"
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
import { CoverageNotice } from "@/components/coverage-notice"
import { isFundingDisclosed } from "@/lib/utils"
import { formatInrCrores } from "@/lib/format"
import type { FundingDeal } from "@/data/funding-data"
import type { Deal } from "@/lib/types"

const TOP_SECTORS = [
  "Fintech", "Edtech", "Healthtech", "SaaS", "EV", "Logistics",
  "D2C", "Agritech", "Deeptech", "Gaming",
]

const VELOCITY_SECTORS_LINK = `/explore?${TOP_SECTORS.map((s) => `sector=${encodeURIComponent(s)}`).join("&")}`

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "deepdive", label: "Deep Dive" },
  { value: "flow", label: "Money Flow" },
  { value: "geography", label: "Geography" },
  { value: "compare", label: "Year-on-Year" },
  { value: "velocity", label: "Sector Velocity" },
]

interface AnalyticsClientProps {
  deals: Deal[]
  coverage?: { earliest: string; latest: string; total: number }
}

// KPI/ticker amounts are pre-converted to INR crores at the call sites below
// (raw deal amounts are in lakhs → divided by 100 first).
const TAB_TRIGGER_CLASS =
  "rounded-none border-[3px] border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black " +
  "transition-all hover:bg-[#1A5D1A]/10 " +
  "data-[state=active]:bg-[#1A5D1A] data-[state=active]:text-white data-[state=active]:shadow-[3px_3px_0_#000]"

export function AnalyticsClient({ deals, coverage }: AnalyticsClientProps) {
  // Deal from lib/types is structurally compatible with FundingDeal from the data file.
  const fd = deals as unknown as FundingDeal[]

  const { kpis, ticker } = useMemo(() => {
    const disclosed = deals.filter((d) => isFundingDisclosed(d.amount))
    const totalLakh = disclosed.reduce((sum, d) => sum + d.amount, 0)

    const sectors = new Set<string>()
    const investors = new Set<string>()
    for (const d of deals) {
      d.sectors.forEach((s) => sectors.add(s))
      d.investors.forEach((i) => investors.add(i))
    }

    const years = deals
      .map((d) => new Date(d.date).getFullYear())
      .filter((y) => !Number.isNaN(y))
    const startYear = coverage ? new Date(coverage.earliest).getFullYear() : Math.min(...years)
    const endYear = coverage ? new Date(coverage.latest).getFullYear() : Math.max(...years)

    const kpis = [
      { label: "Capital Tracked", value: formatInrCrores(totalLakh / 100) },
      { label: "Deals", value: deals.length.toLocaleString("en-IN") },
      { label: "Sectors", value: sectors.size.toLocaleString("en-IN") },
      { label: "Investors", value: investors.size.toLocaleString("en-IN") },
      { label: "Coverage", value: `${startYear}–${endYear}` },
    ]

    const ticker = [...disclosed]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map((d) => ({
        company: d.company,
        amount: formatInrCrores(d.amount / 100),
        stage: d.stage,
      }))

    return { kpis, ticker }
  }, [deals, coverage])

  // duplicated once so the marquee can loop seamlessly
  const tickerLoop = ticker.length ? [...ticker, ...ticker] : []

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EFEDE3]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Masthead */}
        <header className="neo-border neo-shadow-lg bg-white">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#1A5D1A]">
              <span className="inline-block h-2.5 w-2.5 bg-[#FF5A1F]" aria-hidden />
              India · Startup Funding Intelligence
            </div>
            <h1 className="mt-2 text-5xl md:text-7xl font-bold tracking-tighter leading-none">
              ANALYTICS
            </h1>
            <div className="mt-3 h-1.5 w-24 bg-[#FF5A1F]" aria-hidden />
            <p className="mt-3 max-w-2xl text-gray-600">
              Every disclosed round across India&apos;s startup ecosystem — source-backed,
              de-duplicated, and free to explore.
            </p>
          </div>

          {/* Live deal ticker — the signature */}
          {tickerLoop.length > 0 && (
            <div className="ticker-mask overflow-hidden border-t-4 border-black bg-[#0D3D0D]">
              <div className="ticker-track py-2.5" aria-hidden="true">
                {tickerLoop.map((t, i) => (
                  <span key={i} className="mx-5 inline-flex items-baseline gap-2 font-mono text-sm">
                    <span className="font-bold text-[#7AED7A]">{t.amount}</span>
                    <span className="font-semibold text-white">{t.company}</span>
                    <span className="text-[11px] uppercase tracking-wide text-white/45">{t.stage}</span>
                    <span className="ml-3 text-white/25">/</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* KPI ledger strip — connected, shared-edge tiles like an exchange board */}
        <dl className="mt-6 grid grid-cols-2 md:grid-cols-5 neo-border neo-shadow bg-white divide-x-[3px] divide-y-[3px] md:divide-y-0 divide-black">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="p-4 md:p-5">
              <dd className="ledger-figure text-2xl md:text-3xl font-bold text-[#1A5D1A]">
                {kpi.value}
              </dd>
              <dt className="mt-1 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">
                {kpi.label}
              </dt>
            </div>
          ))}
        </dl>

        {coverage && (
          <CoverageNotice
            earliest={coverage.earliest}
            latest={coverage.latest}
            total={coverage.total}
            className="mt-6"
          />
        )}

        <Tabs
          defaultValue="overview"
          className="mt-8 space-y-8"
          onValueChange={(tab) => track("analytics_tab", { tab })}
        >
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className={TAB_TRIGGER_CLASS}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Section eyebrow="Trend" title="Monthly Funding Volume">
              <FundingTrendLine deals={fd} sourceLink="/explore" />
            </Section>
            <Section eyebrow="Sectors" title="Top 15 Sectors by Total Funding">
              <SectorBarChart deals={fd} topN={15} sourceLink="/explore" />
            </Section>
            <Section eyebrow="Stages" title="Deal Count by Stage">
              <StageFunnel deals={fd} sourceLink="/explore" />
            </Section>

            <Divider label="Detailed Breakdown" />
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="deepdive" className="space-y-6">
            <Section
              eyebrow="Sectors"
              title="Sector Bubble Chart"
              description="X = deal count · Y = average deal size · bubble = total funding"
            >
              <BubbleChart deals={fd} sourceLink="/explore" />
            </Section>
            <Section eyebrow="Sectors × Time" title="Funding Heatmap">
              <FundingHeatmap deals={fd} topSectors={12} sourceLink="/explore" />
            </Section>
          </TabsContent>

          <TabsContent value="flow">
            <Section
              eyebrow="Capital Flow"
              title="Investor → Sector Money Flow"
              description="Top 10 lead investors funding the top 8 sectors"
            >
              <SankeyDiagram deals={fd} topInvestors={10} topSectors={8} sourceLink="/explore" />
            </Section>
          </TabsContent>

          <TabsContent value="geography">
            <Section eyebrow="Geography" title="Funding by City">
              <IndiaMap deals={fd} sourceLink="/explore" />
            </Section>
          </TabsContent>

          <TabsContent value="compare">
            <Section eyebrow="Comparison" title="Year-on-Year Monthly Comparison">
              <YoYComparison deals={fd} sourceLink="/explore" />
            </Section>
          </TabsContent>

          <TabsContent value="velocity">
            <Section eyebrow="Momentum" title="Sector Deal Velocity" description="Rolling 16 weeks">
              <DealVelocity deals={fd} sectors={TOP_SECTORS} sourceLink={VELOCITY_SECTORS_LINK} />
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="neo-border neo-shadow bg-white p-5 md:p-7">
      <div className="mb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 pt-4">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-black whitespace-nowrap">
        {label}
      </span>
      <span className="h-1 flex-1 bg-black" />
    </div>
  )
}
