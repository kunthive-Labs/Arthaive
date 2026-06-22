import type { Metadata } from "next"
import Link from "next/link"
import { SectionHeader } from "@/components/section-header"
import { EmptyState } from "@/components/empty-state"
import { getAllSectorsWithStats } from "@/lib/db/sectors"
import { formatFundingAmount } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Sectors | Arthaive",
  description:
    "Browse Indian startup funding activity by sector — deal counts, total funding and leading verticals across the ecosystem.",
}

export default async function SectorsPage() {
  const sectors = await getAllSectorsWithStats()

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <SectionHeader
        title="Browse by Sector"
        subtitle={
          sectors.length > 0
            ? `Funding activity across ${sectors.length} Indian startup verticals`
            : "Funding activity across Indian startup verticals"
        }
      />

      {sectors.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No sectors yet"
            description="Sector funding data isn't available right now. Check back once deals have been ingested."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {sectors.map((sector) => (
            <Link key={sector.slug} href={`/sectors/${sector.slug}`}>
              <div className="neo-border neo-hover p-5 bg-white cursor-pointer h-full flex flex-col gap-3">
                <h3 className="font-bold text-base leading-tight line-clamp-2">{sector.name}</h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xl font-bold text-green-700">
                      {sector.dealCount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Deals</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-700">
                      {formatFundingAmount(sector.totalFunding)}
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Total Funding</div>
                  </div>
                </div>

                {sector.topStages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {sector.topStages.slice(0, 3).map((stage) => (
                      <span
                        key={stage}
                        className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 font-medium"
                      >
                        {stage}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
