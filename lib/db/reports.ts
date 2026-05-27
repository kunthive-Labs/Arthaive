export interface ReportPeriod {
  id: string // "2026-W20" (ISO week) or "2026-05" (month)
  type: "week" | "month"
  label: string // "Week of 11 May 2026" or "May 2026"
  start: string // ISO date, inclusive
  end: string // ISO date, inclusive
}

// ---------------------------------------------------------------------------
// ISO week helpers (UTC-based to avoid timezone drift)
// ---------------------------------------------------------------------------
function isoWeekStart(year: number, week: number): Date {
  // Jan 4th is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = (jan4.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Dow)
  const start = new Date(week1Monday)
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return start
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function parsePeriod(period: string): ReportPeriod | null {
  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(period)
  if (weekMatch) {
    const year = Number(weekMatch[1])
    const week = Number(weekMatch[2])
    if (week < 1 || week > 53) return null
    const start = isoWeekStart(year, week)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    const startDay = start.getUTCDate()
    const startMonth = MONTH_NAMES[start.getUTCMonth()].slice(0, 3)
    return {
      id: period,
      type: "week",
      label: `Week of ${startDay} ${startMonth} ${start.getUTCFullYear()}`,
      start: toISODate(start),
      end: toISODate(end),
    }
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const month = Number(monthMatch[2])
    if (month < 1 || month > 12) return null
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day
    return {
      id: period,
      type: "month",
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      start: toISODate(start),
      end: toISODate(end),
    }
  }

  return null
}
