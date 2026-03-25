"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface LiveDeal {
  id: string
  company: string
  amount: number
  stage: string
  sectors: string[]
  location: string
  date: string
  inserted_at: string
}

export function LiveDealFeed() {
  const [deals, setDeals] = useState<LiveDeal[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Load recent deals
    supabase
      .from("deals")
      .select("id, company, amount, stage, sectors, location, date, inserted_at")
      .order("inserted_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setDeals(data as LiveDeal[])
      })

    // Subscribe to new inserts
    const channel = supabase
      .channel("live-deals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deals" },
        (payload) => {
          const newDeal = payload.new as LiveDeal
          setDeals((prev) => [newDeal, ...prev].slice(0, 50))
          toast.success(`New deal: ${newDeal.company} — ${newDeal.stage}`, {
            description: `₹${newDeal.amount} Cr · ${newDeal.location}`,
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!deals.length) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-2" />
        <span className="text-muted-foreground text-sm">Listening for new deals…</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {deals.map((deal) => (
        <div key={deal.id} className="rounded-lg border p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{deal.company}</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{deal.stage}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {(deal.sectors ?? []).slice(0, 2).join(" · ")} · {deal.location}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold text-sm">₹{deal.amount?.toLocaleString("en-IN")} Cr</div>
            <div className="text-xs text-muted-foreground">
              {new Date(deal.date ?? deal.inserted_at).toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
