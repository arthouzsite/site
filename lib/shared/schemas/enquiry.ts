import { z } from 'zod'
import { ENQUIRY_KINDS } from '../constants'
import { todayInKolkata } from '../format/status'
import { NAME_MESSAGE, NO_DIGITS_PATTERN } from './common'

export const ENQUIRY_NAME_MAX = 120
export const ENQUIRY_EMAIL_MAX = 254
export const ENQUIRY_MOBILE_MAX = 30
export const ENQUIRY_MESSAGE_MAX = 2000
export const ENQUIRY_PURPOSE_MAX = 200
export const ENQUIRY_LOCATION_MAX = 100
export const ENQUIRY_CAPTCHA_MAX = 20
const SLUG_MAX = 200
const IMAGE_URL_MAX = 2000
const CAPTCHA_TOKEN_MAX = 200
const CAPTCHA_MESSAGE = 'Enter the security code'
const HONEYPOT_MAX = 200

const ISO_DATE_LENGTH = 10
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MOBILE_SEPARATORS = /[\s().-]/g
const INTERNATIONAL_MOBILE = /^\+\d{8,15}$/
const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/
const INDIAN_LOCAL_MOBILE = /^(?:91|0)?([6-9]\d{9})$/
const INDIA_PREFIX = '+91'

const MOBILE_MESSAGE = 'Enter a valid mobile number, e.g. 98765 43210 or +44 20 7946 0958'
const EMAIL_MESSAGE = 'Enter a valid email address'

/**
 * A mobile number in canonical `+<country><digits>` form, or null. Indian numbers may be written without the
 * country code (10 digits starting 6-9, optionally with a leading 0 or 91); anything else must be international.
 */
export function normaliseMobile(raw: string): string | null {
  const stripped = raw.trim().replace(MOBILE_SEPARATORS, '')
  if (stripped.startsWith('+')) {
    if (!INTERNATIONAL_MOBILE.test(stripped)) return null
    return stripped.startsWith(INDIA_PREFIX) && !INDIAN_MOBILE.test(stripped) ? null : stripped
  }
  const local = INDIAN_LOCAL_MOBILE.exec(stripped)?.[1]
  return local ? `${INDIA_PREFIX}${local}` : null
}

const required = (message: string, max: number) => z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer`)

const isCalendarDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}
const date = (message: string) => z.string().trim().refine(isCalendarDate, message)

const mobile = z
  .string()
  .trim()
  .min(1, 'Enter your mobile number')
  .max(ENQUIRY_MOBILE_MAX, MOBILE_MESSAGE)
  .transform((value, ctx) => {
    const normalised = normaliseMobile(value)
    if (normalised) return normalised
    ctx.addIssue({ code: 'custom', message: MOBILE_MESSAGE })
    return z.NEVER
  })

const person = {
  name: required('Enter your name', ENQUIRY_NAME_MAX).regex(NO_DIGITS_PATTERN, NAME_MESSAGE),
  mobile,
  email: required('Enter your email', ENQUIRY_EMAIL_MAX).toLowerCase().pipe(z.email(EMAIL_MESSAGE)),
  message: z.string().trim().max(ENQUIRY_MESSAGE_MAX, `Use ${ENQUIRY_MESSAGE_MAX} characters or fewer`).default(''),
  /** Honeypot: hidden from people, so only a bot fills it. The server accepts and discards such a submission. */
  refCode: z.string().max(HONEYPOT_MAX).default(''),
}

/** Slug of the service or artist the enquiry is about; the public site identifies records by slug. */
const slug = z.string().trim().min(1).max(SLUG_MAX)

type Stay = { dateFrom?: unknown; dateTo?: unknown }

const isDay = (value: unknown): value is string => typeof value === 'string' && isCalendarDate(value)
const todayIso = (): string => todayInKolkata().toISOString().slice(0, ISO_DATE_LENGTH)

// Cross-field rules still run when other fields fail, so every problem shows at once; they only need valid dates.
const whenDatesValid = (payload: { value?: unknown }): boolean => {
  const stay = (payload.value ?? {}) as Stay
  return isDay(stay.dateFrom) && isDay(stay.dateTo)
}

export const serviceEnquirySchema = z
  .object({
    kind: z.literal('SERVICE'),
    slug,
    ...person,
    dateFrom: date('Choose a start date'),
    dateTo: date('Choose an end date'),
    purpose: required('Enter the purpose', ENQUIRY_PURPOSE_MAX),
    location: required('Choose a location', ENQUIRY_LOCATION_MAX),
  })
  .refine((stay) => stay.dateFrom >= todayIso(), { path: ['dateFrom'], message: 'Date from cannot be in the past', when: whenDatesValid })
  .refine((stay) => stay.dateTo >= stay.dateFrom, { path: ['dateTo'], message: 'Date to cannot be before date from', when: whenDatesValid })

/** An enquiry to an artist; `imageUrl` names one of that artist's works when the visitor enquired from it. */
export const artistEnquirySchema = z.object({
  kind: z.literal('ARTIST'),
  slug,
  imageUrl: z.string().trim().min(1).max(IMAGE_URL_MAX).optional(),
  ...person,
})

/**
 * An order request for one print: `slug` is its category and `imageUrl` the print, as the public site knows it.
 * It carries the answer to a picture challenge, checked by the server before anything is stored.
 */
export const printEnquirySchema = z.object({
  kind: z.literal('PRINT'),
  slug,
  imageUrl: z.string().trim().min(1).max(IMAGE_URL_MAX),
  ...person,
  captchaToken: z.string(CAPTCHA_MESSAGE).min(1, CAPTCHA_MESSAGE).max(CAPTCHA_TOKEN_MAX),
  captcha: required(CAPTCHA_MESSAGE, ENQUIRY_CAPTCHA_MAX),
})

/** The one definition of a public enquiry, used by the forms on the site and by the endpoint. */
export const enquiryInputSchema = z.discriminatedUnion('kind', [serviceEnquirySchema, artistEnquirySchema, printEnquirySchema])

export const enquiryKindSchema = z.enum(ENQUIRY_KINDS)

export const enquiryHandledSchema = z.object({ isHandled: z.boolean() })

export type ServiceEnquiryInput = z.infer<typeof serviceEnquirySchema>
export type ArtistEnquiryInput = z.infer<typeof artistEnquirySchema>
export type PrintEnquiryInput = z.infer<typeof printEnquirySchema>
export type EnquiryInput = z.infer<typeof enquiryInputSchema>
export type EnquiryHandledInput = z.infer<typeof enquiryHandledSchema>
