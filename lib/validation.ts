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
export type NotifyPrefs = z.infer<typeof notifySchema>
