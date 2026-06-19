import { NextRequest, NextResponse } from "next/server"
import { getDeals } from "@/lib/db/deals"
import { dealsQuerySchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Validate numeric query params: guards NaN and bounds amounts.
    const parsed = dealsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      minAmount: searchParams.get("minAmount") ?? undefined,
      maxAmount: searchParams.get("maxAmount") ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const filters = {
      search: searchParams.get("search") || "",
      investorSearch: searchParams.get("investor") || "",
      sectors: searchParams.getAll("sector"),
      stages: searchParams.getAll("stage"),
      location: searchParams.get("location") || "",
      minAmount: parsed.data.minAmount,
      maxAmount: parsed.data.maxAmount ?? Infinity,
      years: searchParams.getAll("year"),
      showUndisclosed: searchParams.get("undisclosed") !== "false",
      sortBy: (searchParams.get("sort") || "date") as "date" | "amount",
      page: parsed.data.page,
      limit: Math.min(Number(searchParams.get("limit") || 20), 100),
    }

    const result = await getDeals(filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/deals error:", error)
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
  }
}
