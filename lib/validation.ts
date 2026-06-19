import { z } from "zod"

export const dealIdSchema = z.string().min(1).max(100)

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  sector: z.array(z.string()).optional(),
  stage: z.array(z.string()).optional(),
  location: z.string().optional(),
})

export const amountSchema = z.number().nonnegative().finite()

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(d => d.from <= d.to, "from must be before to")

export const notifySchema = z.object({
  email_deals: z.boolean().optional(),
  email_weekly: z.boolean().optional(),
  email_alerts: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
})

// Read-route query params for /api/deals — coerces strings, guards NaN, bounds amounts.
export const dealsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  minAmount: z.coerce.number().nonnegative().finite().default(0),
  maxAmount: z.coerce.number().positive().finite().optional(),
})

// /api/export — paginated, capped page size for a DB-backed dump.
export const EXPORT_MAX_LIMIT = 500
export const exportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(EXPORT_MAX_LIMIT).default(EXPORT_MAX_LIMIT),
})

// /api/compare — cap the number of ids accepted in one request.
export const COMPARE_MAX_IDS = 5
export const compareIdsSchema = z
  .array(dealIdSchema)
  .min(2, "Need at least 2 ids")
  .max(COMPARE_MAX_IDS, `At most ${COMPARE_MAX_IDS} ids`)

// /api/profile PATCH — bound length + strip angle brackets to blunt stored-XSS.
const sanitizeText = (s: string) => s.replace(/[<>]/g, "").trim()
export const profilePatchSchema = z.object({
  full_name: z.string().max(120).transform(sanitizeText).optional(),
  avatar_url: z
    .string()
    .max(2048)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "must be http(s) URL")
    .optional(),
})

// /api/v1/trends/monthly — range-check the requested year.
export const yearSchema = z.coerce.number().int().min(2000).max(2100)
