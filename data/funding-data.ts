// Auto-generated from CSV files in funding_data/
// Last updated: 2026-08-21T06:34:26.755Z
// Parsed from CSV: 14739 deals
//
// Total deals emitted: 0 — intentionally empty.
// Supabase is the single source of truth at runtime; this array exists only as
// a type-bearing placeholder for the FundingDeal interface below. Baking the
// parsed dataset in here would create a second, stale copy of the data.
// Regenerate with 'npm run generate-data' (see scripts/generate-funding-data.js).
//
// Currency conversion: 1 USD = ₹83.5 INR (as of 2025-11-30)
// To update exchange rate: Edit config/currency.js and run 'npm run generate-data'

export interface FundingDeal {
  id: string;
  company: string;
  amount: number;
  stage: string;
  sectors: string[];
  investors: string[];
  leadInvestor: string;
  date: string;
  location: string;
  description: string;
  sourceUrl: string;
  weekFolder: string;
}

export const fundingData: FundingDeal[] = [];
