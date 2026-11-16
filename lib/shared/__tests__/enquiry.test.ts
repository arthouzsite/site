import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  ENQUIRY_EMAIL_MAX, ENQUIRY_MESSAGE_MAX, ENQUIRY_NAME_MAX, ENQUIRY_PURPOSE_MAX,
  artistEnquirySchema, enquiryHandledSchema, enquiryInputSchema, normaliseMobile, serviceEnquirySchema,
} from '../index'

const TODAY = '2026-11-16'
const service = {
  kind: 'SERVICE', slug: 'art-sales', name: 'Asha Rao', mobile: '98765 43210', email: 'asha@example.com',
  dateFrom: '2026-12-01', dateTo: '2026-12-05', purpose: 'Photography', location: 'Chennai', message: '',
}
const artist = { kind: 'ARTIST', slug: 'vijay', name: 'Asha Rao', mobile: '+44 20 7946 0958', email: 'asha@example.com' }

const firstIssue = (input: unknown) => {
  const result = enquiryInputSchema.safeParse(input)
  if (result.success) throw new Error('expected a failure')
  return { path: result.error.issues[0]?.path.join('.'), message: result.error.issues[0]?.message }
}
const failedPaths = (input: unknown): string[] => {
  const result = enquiryInputSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${TODAY}T06:00:00.000Z`))
})
afterEach(() => vi.useRealTimers())

describe('enquiryInputSchema', () => {
  test('accepts a service enquiry, trims text and normalises the mobile', () => {
    const parsed = enquiryInputSchema.parse({ ...service, name: '  Asha Rao ', purpose: ' Photography ', message: '  Hello  ' })
    expect(parsed).toMatchObject({ name: 'Asha Rao', purpose: 'Photography', message: 'Hello', mobile: '+919876543210', refCode: '' })
  })

  test('accepts an artist enquiry without dates, purpose or location', () => {
    expect(enquiryInputSchema.parse(artist)).toMatchObject({ kind: 'ARTIST', slug: 'vijay', message: '', mobile: '+442079460958' })
  })

  test('message is optional for both kinds', () => {
    expect(enquiryInputSchema.safeParse({ ...service, message: undefined }).success).toBe(true)
    expect(enquiryInputSchema.safeParse(artist).success).toBe(true)
  })

  test('requires name, mobile and email', () => {
    expect(failedPaths({ ...artist, name: '', mobile: '', email: '' })).toEqual(expect.arrayContaining(['name', 'mobile', 'email']))
  })

  test('requires dates, purpose and location for a service', () => {
    const bare = { kind: service.kind, slug: service.slug, name: service.name, mobile: service.mobile, email: service.email }
    expect(failedPaths(bare)).toEqual(expect.arrayContaining(['dateFrom', 'dateTo', 'purpose', 'location']))
  })

  test('rejects a date to before the date from, on dateTo', () => {
    expect(firstIssue({ ...service, dateFrom: '2026-12-05', dateTo: '2026-12-01' })).toEqual({
      path: 'dateTo', message: 'Date to cannot be before date from',
    })
  })

  test('allows the same day for from and to', () => {
    expect(enquiryInputSchema.safeParse({ ...service, dateFrom: '2026-12-05', dateTo: '2026-12-05' }).success).toBe(true)
  })

  test('rejects a date from in the past, but accepts today (Kolkata)', () => {
    expect(firstIssue({ ...service, dateFrom: '2026-11-15', dateTo: '2026-12-01' })).toEqual({
      path: 'dateFrom', message: 'Date from cannot be in the past',
    })
    expect(enquiryInputSchema.safeParse({ ...service, dateFrom: TODAY, dateTo: TODAY }).success).toBe(true)
  })

  test('uses the Kolkata day, which rolls over at 18:30 UTC', () => {
    vi.setSystemTime(new Date('2026-11-16T19:00:00.000Z'))
    expect(failedPaths({ ...service, dateFrom: TODAY, dateTo: '2026-12-01' })).toEqual(['dateFrom'])
  })

  test.each(['2026-13-01', '2026-02-30', '01/12/2026', '2026-12-1', ''])('rejects the date %j', (value) => {
    expect(failedPaths({ ...service, dateFrom: value }).includes('dateFrom')).toBe(true)
  })

  test.each([
    ['98765 43210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+44 20 7946 0958', '+442079460958'],
    ['+1 (415) 555-0132', '+14155550132'],
  ])('accepts the mobile %s as %s', (input, expected) => {
    expect(normaliseMobile(input)).toBe(expected)
    expect(enquiryInputSchema.parse({ ...artist, mobile: input }).mobile).toBe(expected)
  })

  test.each(['12345', '1234567890', '+91 12345 67890', 'abcdefghij', '+1234567', '+1234567890123456', '98765 4321x', '++919876543210'])(
    'rejects the mobile %s',
    (mobile) => {
      expect(normaliseMobile(mobile)).toBeNull()
      expect(failedPaths({ ...artist, mobile })).toEqual(['mobile'])
    },
  )

  test('rejects a name with digits, as the CMS does', () => {
    expect(firstIssue({ ...artist, name: 'Asha 2' }).path).toBe('name')
  })

  test('rejects a malformed email and lower-cases a valid one', () => {
    expect(firstIssue({ ...artist, email: 'not-an-email' })).toEqual({ path: 'email', message: 'Enter a valid email address' })
    expect(enquiryInputSchema.parse({ ...artist, email: ' Asha@Example.COM ' }).email).toBe('asha@example.com')
  })

  test('enforces the length limits', () => {
    expect(failedPaths({ ...artist, name: 'A'.repeat(ENQUIRY_NAME_MAX + 1) })).toEqual(['name'])
    expect(failedPaths({ ...artist, email: `${'a'.repeat(ENQUIRY_EMAIL_MAX)}@example.com` })).toEqual(['email'])
    expect(failedPaths({ ...artist, message: 'x'.repeat(ENQUIRY_MESSAGE_MAX + 1) })).toEqual(['message'])
    expect(failedPaths({ ...service, purpose: 'x'.repeat(ENQUIRY_PURPOSE_MAX + 1) })).toEqual(['purpose'])
    expect(enquiryInputSchema.safeParse({ ...artist, message: 'x'.repeat(ENQUIRY_MESSAGE_MAX) }).success).toBe(true)
  })

  test('whitespace-only required fields count as empty', () => {
    expect(failedPaths({ ...service, purpose: '   ', location: '  ' })).toEqual(expect.arrayContaining(['purpose', 'location']))
  })

  test('rejects an unknown kind', () => {
    expect(enquiryInputSchema.safeParse({ ...artist, kind: 'NEWS' }).success).toBe(false)
  })

  test('the per-kind schemas serve the forms', () => {
    expect(serviceEnquirySchema.safeParse(service).success).toBe(true)
    expect(artistEnquirySchema.safeParse(artist).success).toBe(true)
    expect(artistEnquirySchema.safeParse(service).success).toBe(false)
  })
})

describe('enquiryHandledSchema', () => {
  test('takes a boolean', () => {
    expect(enquiryHandledSchema.parse({ isHandled: true })).toEqual({ isHandled: true })
    expect(enquiryHandledSchema.safeParse({ isHandled: 'yes' }).success).toBe(false)
  })
})
