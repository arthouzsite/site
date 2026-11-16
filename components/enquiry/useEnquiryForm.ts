'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { ZodError } from 'zod'
import { EnquiryError, sendEnquiry } from '@/lib/enquiry-client'
import { artistEnquirySchema, serviceEnquirySchema } from '@/lib/shared'

export type EnquiryTarget =
  | { kind: 'SERVICE'; slug: string; title: string; locations: readonly string[] }
  | { kind: 'ARTIST'; slug: string; name: string }

export const FIELD_NAMES = ['name', 'mobile', 'email', 'dateFrom', 'dateTo', 'purpose', 'location', 'message', 'refCode'] as const
export type FieldName = (typeof FIELD_NAMES)[number]
export type FieldValues = Record<FieldName, string>
export type FieldErrors = Partial<Record<FieldName, string>>
export type FormStatus = 'editing' | 'sending' | 'sent'

const EMPTY: FieldValues = { name: '', mobile: '', email: '', dateFrom: '', dateTo: '', purpose: '', location: '', message: '', refCode: '' }
const RETRY_MESSAGE = 'We could not send your enquiry. Please try again in a moment.'
const isField = (name: string): name is FieldName => (FIELD_NAMES as readonly string[]).includes(name)

/** Keeps the first message per known field, so a field never shows more than one error. */
function firstPerField(pairs: ReadonlyArray<readonly [string, string]>): FieldErrors {
  const out: FieldErrors = {}
  for (const [name, message] of pairs) if (isField(name) && !out[name]) out[name] = message
  return out
}

const fromIssues = (error: ZodError): FieldErrors => firstPerField(error.issues.map((issue) => [String(issue.path[0] ?? ''), issue.message]))

function payloadFor(target: EnquiryTarget, values: FieldValues): unknown {
  const { name, mobile, email, message, refCode } = values
  const common = { slug: target.slug, name, mobile, email, message, refCode }
  if (target.kind === 'ARTIST') return { kind: 'ARTIST', ...common }
  const { dateFrom, dateTo, purpose, location } = values
  return { kind: 'SERVICE', ...common, dateFrom, dateTo, purpose, location }
}

/** Form state for the enquiry dialog: validates with the shared schema, posts, and tracks inline errors. */
export function useEnquiryForm(target: EnquiryTarget) {
  const [values, setValues] = useState<FieldValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<FormStatus>('editing')
  const [focusRequest, setFocusRequest] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // Focus follows a failed submit to the first invalid control, once it has re-rendered with aria-invalid.
  useEffect(() => {
    if (focusRequest > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  const setValue = useCallback((name: FieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (status === 'sending') return
    const schema = target.kind === 'SERVICE' ? serviceEnquirySchema : artistEnquirySchema
    const parsed = schema.safeParse(payloadFor(target, values))
    setFormError(null)
    if (!parsed.success) {
      setErrors(fromIssues(parsed.error))
      setFocusRequest((count) => count + 1)
      return
    }
    setErrors({})
    setStatus('sending')
    try {
      await sendEnquiry(parsed.data)
      setStatus('sent')
    } catch (error) {
      const failure = error instanceof EnquiryError ? error : new EnquiryError(RETRY_MESSAGE)
      const fields = firstPerField(Object.entries(failure.fields))
      const hasFieldErrors = Object.keys(fields).length > 0
      setErrors(fields)
      setFormError(hasFieldErrors ? null : failure.message)
      setStatus('editing')
      if (hasFieldErrors) setFocusRequest((count) => count + 1)
    }
  }

  return { values, errors, formError, status, formRef, setValue, submit }
}
