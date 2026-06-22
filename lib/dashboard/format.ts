// Deal amounts are stored in INR lakhs. 1 Cr = 100 lakh.

// Lakhs → a human ₹ Cr / K Cr / L Cr string.
export function fmtCrFromLakh(lakh: number): string {
  return fmtCr(lakh / 100)
}

export function fmtCr(cr: number): string {
  if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)} L Cr`
  if (cr >= 1e3) return `₹${(cr / 1e3).toFixed(1)}K Cr`
  return `₹${Math.round(cr).toLocaleString("en-IN")} Cr`
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("en-IN")
}
