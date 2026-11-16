import { z } from 'zod'
import type { EnquiryInput } from '@/lib/shared'
import { ENQUIRY_KINDS } from '@/lib/shared'
import { parsePagination } from '@/lib/server/common/pagination'
import { claimThrottleSlot } from '@/lib/server/common/throttle'
import { Prisma } from '@/lib/server/generated/prisma/client'
import { ApiException, notFound, tooManyRequests } from '@/lib/server/http/errors'
import { withMeta } from '@/lib/server/http/route'
import { prisma } from '@/lib/server/prisma'
import { ENQUIRY_FAILED_MESSAGE, ENQUIRY_THROTTLED_MESSAGE } from './enquiries.constants'
import { enquiryThrottleFor } from './enquiry-throttle'
import { toAdminEnquiry } from './enquiries.mapper'

const SERVICE_NOT_FOUND = 'Service not found'
const ARTIST_NOT_FOUND = 'Artist not found'
const ENQUIRY_NOT_FOUND = 'Enquiry not found'
const BAD_LOCATION = 'Choose one of our locations'
const BAD_REQUEST_STATUS = 400

export const enquiryListQuerySchema = z.object({
  kind: z.enum(ENQUIRY_KINDS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})
export type EnquiryListQuery = z.infer<typeof enquiryListQuerySchema>

const asDay = (value: string): Date => new Date(`${value}T00:00:00.000Z`)

type Subject = { id: string; label: string }

async function publishedService(slug: string): Promise<Subject> {
  const row = await prisma.service.findFirst({ where: { slug, isPublished: true }, select: { id: true, title: true } })
  if (!row) throw notFound(SERVICE_NOT_FOUND)
  return { id: row.id, label: row.title }
}

async function publishedArtist(slug: string): Promise<Subject> {
  const row = await prisma.artist.findFirst({ where: { slug, isPublished: true }, select: { id: true, name: true } })
  if (!row) throw notFound(ARTIST_NOT_FOUND)
  return { id: row.id, label: row.name }
}

/**
 * A location the public list offers: that list is every Location row, shown by `city`, so the match is exact on
 * `city` (no case folding) and a made-up place is refused.
 */
async function knownLocation(city: string): Promise<string> {
  const row = await prisma.location.findFirst({ where: { city }, select: { city: true } })
  if (!row) throw new ApiException(BAD_REQUEST_STATUS, 'VALIDATION', 'Some fields need attention', { location: BAD_LOCATION })
  return row.city
}

async function claimSlot(ip: string): Promise<void> {
  const { key, rule } = enquiryThrottleFor(ip)
  if (!(await claimThrottleSlot(key, rule))) throw tooManyRequests('RATE_LIMITED', ENQUIRY_THROTTLED_MESSAGE)
}

function contact({ name, email, mobile, message }: EnquiryInput) {
  return { name, email, mobile, message }
}

async function rowFor(input: EnquiryInput): Promise<Prisma.EnquiryUncheckedCreateInput> {
  if (input.kind === 'ARTIST') {
    const artist = await publishedArtist(input.slug)
    return { kind: 'ARTIST', artistId: artist.id, subject: artist.label, ...contact(input) }
  }
  const service = await publishedService(input.slug)
  const location = await knownLocation(input.location)
  return {
    kind: 'SERVICE', serviceId: service.id, subject: service.label, ...contact(input),
    dateFrom: asDay(input.dateFrom), dateTo: asDay(input.dateTo), purpose: input.purpose, location,
  }
}

/**
 * Stores a public enquiry. A filled honeypot is accepted and dropped so a bot learns nothing. The rejection logged
 * for any storage failure carries only the Prisma code, never the submission (it holds personal data).
 */
export async function submit(input: EnquiryInput, ip: string): Promise<{ received: true }> {
  if (input.refCode !== '') return { received: true }
  // Targets are checked first so unknown slugs and locations (probing) do not use up a visitor's slots.
  const data = await rowFor(input)
  await claimSlot(ip)
  try {
    await prisma.enquiry.create({ data })
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? ` (${error.code})` : ''
    throw new Error(`${ENQUIRY_FAILED_MESSAGE}${code}`)
  }
  return { received: true }
}

export async function list(query: EnquiryListQuery = {}) {
  const { page, limit, skip } = parsePagination(query)
  const where: Prisma.EnquiryWhereInput = query.kind ? { kind: query.kind } : {}
  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: limit }),
    prisma.enquiry.count({ where }),
  ])
  return withMeta(rows.map(toAdminEnquiry), { page, limit, total })
}

async function assertExists(id: string): Promise<void> {
  if (!(await prisma.enquiry.findUnique({ where: { id }, select: { id: true } }))) throw notFound(ENQUIRY_NOT_FOUND)
}

export async function setHandled(id: string, isHandled: boolean) {
  await assertExists(id)
  return toAdminEnquiry(await prisma.enquiry.update({ where: { id }, data: { isHandled } }))
}

export async function remove(id: string) {
  await assertExists(id)
  await prisma.enquiry.delete({ where: { id } })
  return { id }
}

export const enquiriesService = { submit, list, setHandled, remove }
