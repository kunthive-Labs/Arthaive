'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FieldName = 'company' | 'amount' | 'stage' | 'date' | 'sourceUrl'
type Errors = Partial<Record<FieldName, string>>

interface FormValues {
  company: string
  amount: string
  stage: string
  date: string
  sourceUrl: string
}

const EMPTY_VALUES: FormValues = {
  company: '',
  amount: '',
  stage: '',
  date: '',
  sourceUrl: '',
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validate(values: FormValues): Errors {
  const errors: Errors = {}

  if (!values.company.trim()) {
    errors.company = 'Company name is required.'
  }

  if (values.amount.trim()) {
    const amount = Number(values.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Amount must be a positive number.'
    }
  }

  if (values.sourceUrl.trim() && !isValidUrl(values.sourceUrl.trim())) {
    errors.sourceUrl = 'Enter a valid URL (including http:// or https://).'
  }

  return errors
}

const inputClass =
  'w-full border-2 border-black rounded-none h-auto px-3 py-2 text-base shadow-none focus-visible:ring-0 focus-visible:border-black aria-invalid:border-destructive'

export function SubmitForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setField(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear a field-level error as soon as the user edits it.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSuccess(null)
    setSubmitError(null)

    const nextErrors = validate(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        company: values.company.trim(),
        stage: values.stage.trim(),
        date: values.date,
        sourceUrl: values.sourceUrl.trim(),
      }
      if (values.amount.trim()) {
        payload.amount = Number(values.amount)
      }

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? 'Submission failed. Please try again.')
      }

      const data = (await res.json().catch(() => null)) as { message?: string } | null
      setValues(EMPTY_VALUES)
      setErrors({})
      setSuccess(data?.message ?? "Submission received. We'll review it shortly.")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="company">
          Company name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company"
          name="company"
          value={values.company}
          onChange={(e) => setField('company', e.target.value)}
          placeholder="Company name"
          required
          disabled={submitting}
          aria-invalid={errors.company ? true : undefined}
          aria-describedby={errors.company ? 'company-error' : undefined}
          className={inputClass}
        />
        {errors.company && (
          <p id="company-error" role="alert" className="text-sm font-medium text-destructive">
            {errors.company}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount raised (in ₹ Lakhs)</Label>
        <Input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          onChange={(e) => setField('amount', e.target.value)}
          placeholder="Amount raised (in ₹ Lakhs)"
          disabled={submitting}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
          className={inputClass}
        />
        {errors.amount && (
          <p id="amount-error" role="alert" className="text-sm font-medium text-destructive">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stage">Stage</Label>
        <Input
          id="stage"
          name="stage"
          value={values.stage}
          onChange={(e) => setField('stage', e.target.value)}
          placeholder="Stage (Seed, Series A...)"
          disabled={submitting}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={values.date}
          onChange={(e) => setField('date', e.target.value)}
          disabled={submitting}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          value={values.sourceUrl}
          onChange={(e) => setField('sourceUrl', e.target.value)}
          placeholder="Source URL"
          disabled={submitting}
          aria-invalid={errors.sourceUrl ? true : undefined}
          aria-describedby={errors.sourceUrl ? 'sourceUrl-error' : undefined}
          className={inputClass}
        />
        {errors.sourceUrl && (
          <p id="sourceUrl-error" role="alert" className="text-sm font-medium text-destructive">
            {errors.sourceUrl}
          </p>
        )}
      </div>

      {success && (
        <p
          role="status"
          className="border-2 border-black bg-green-100 px-3 py-2 text-sm font-bold text-black"
        >
          {success}
        </p>
      )}
      {submitError && (
        <p
          role="alert"
          className="border-2 border-destructive bg-red-100 px-3 py-2 text-sm font-bold text-destructive"
        >
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full rounded-none border-2 border-black bg-black py-2 font-bold text-white hover:bg-gray-800"
      >
        {submitting ? 'Submitting…' : 'Submit Deal'}
      </Button>
    </form>
  )
}
