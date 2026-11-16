import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayInKolkata } from '@/lib/shared'
import { ENQUIRY_BODY_MAX_BYTES, ENQUIRY_SITEWIDE_THROTTLE, ENQUIRY_THROTTLE } from '@/lib/server/enquiries/enquiries.constants'
import { enquiriesService } from '@/lib/server/enquiries/enquiries.service'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const PUBLIC_PATH = '/api/public/enquiries'
const UNKNOWN_ID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'
const MS_PER_DAY = 86_400_000
const SERVICE_INPUT_DAYS = 3
const day = (offset: number) => new Date(todayInKolkata().getTime() + offset * MS_PER_DAY).toISOString().slice(0, 10)

const contact = { name: 'Asha Rao', mobile: '98765 43210', email: 'Asha@Example.com', message: 'Hello' }
const serviceBody = (over: Record<string, unknown> = {}) => ({
  kind: 'SERVICE', slug: 'photo-shoots', ...contact, dateFrom: day(SERVICE_INPUT_DAYS), dateTo: day(5), purpose: 'Photography', location: 'Chennai', ...over,
})
const artistBody = (over: Record<string, unknown> = {}) => ({ kind: 'ARTIST', slug: 'vijay', ...contact, ...over })

// The form's own requests carry the site Origin; tests that omit it say so explicitly.
const SITE_ORIGIN = { origin: 'http://localhost' }
const submit = (body: unknown, headers: Record<string, string> = SITE_ORIGIN) => call('POST', PUBLIC_PATH, { body, headers })

const stay = { dateFrom: day(SERVICE_INPUT_DAYS), dateTo: day(5), purpose: 'Photography', location: 'Chennai' }
// A parsed artist enquiry, as the route hands it to the service.
const enquiryInput = (over: Record<string, unknown> = {}) =>
  ({ kind: 'ARTIST', slug: 'vijay', name: 'Asha Rao', mobile: '+919876543210', email: 'asha@example.com', message: '', refCode: '', ...over }) as Parameters<typeof enquiriesService.submit>[0]

describe('enquiries', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  async function seedTargets() {
    await prisma.service.create({ data: { slug: 'photo-shoots', title: 'Photo shoots', isPublished: true } })
    await prisma.service.create({ data: { slug: 'draft-service', title: 'Draft', isPublished: false } })
    await prisma.artist.create({ data: { slug: 'vijay', name: 'Vijay Pichumani', sortName: 'Pichumani', isPublished: true } })
    await prisma.artist.create({ data: { slug: 'draft-artist', name: 'Draft Artist', sortName: 'Artist', isPublished: false } })
    await prisma.location.create({ data: { slug: 'chennai', city: 'Chennai' } })
  }

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedTargets()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
  })
  afterEach(() => vi.restoreAllMocks())
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/public/enquiries', () => {
    it('stores a service enquiry with a snapshot of the service and a canonical mobile', async () => {
      const res = await submit(serviceBody())
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ ok: true, data: { received: true }, error: null })
      const row = await prisma.enquiry.findFirstOrThrow()
      const service = await prisma.service.findUniqueOrThrow({ where: { slug: 'photo-shoots' } })
      expect(row).toMatchObject({
        kind: 'SERVICE', serviceId: service.id, artistId: null, subject: 'Photo shoots', name: 'Asha Rao', email: 'asha@example.com',
        mobile: '+919876543210', message: 'Hello', purpose: 'Photography', location: 'Chennai', isHandled: false,
      })
      expect(row.dateFrom?.toISOString().slice(0, 10)).toBe(day(3))
      expect(row.dateTo?.toISOString().slice(0, 10)).toBe(day(5))
    })

    it('stores an artist enquiry', async () => {
      const res = await submit(artistBody())
      expect(res.status).toBe(201)
      const row = await prisma.enquiry.findFirstOrThrow()
      expect(row).toMatchObject({ kind: 'ARTIST', subject: 'Vijay Pichumani', serviceId: null, dateFrom: null, purpose: null, location: null })
      expect(row.artistId).not.toBeNull()
    })

    it('400 VALIDATION with per-field messages and nothing stored', async () => {
      const res = await submit(serviceBody({ name: '', mobile: '123', email: 'nope', dateFrom: day(-1), purpose: '' }))
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION')
      expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['name', 'mobile', 'email', 'dateFrom', 'purpose']))
      expect(await prisma.enquiry.count()).toBe(0)
    })

    it('400 for a body that is not an object', async () => {
      expect((await call('POST', PUBLIC_PATH, { raw: '[]', headers: { ...SITE_ORIGIN, 'content-type': 'application/json' } })).status).toBe(400)
    })

    it('accepts exactly the locations the public list offers, no case folding', async () => {
      const res = await submit(serviceBody({ location: 'chennai' }))
      expect(res.status).toBe(400)
      expect(res.body.error.fields).toEqual({ location: 'Choose one of our locations' })
      const offered = (await call('GET', '/api/public/locations')).body.data.map((l: { city: string }) => l.city)
      expect(offered).toEqual(['Chennai'])
    })

    it('400 on a location that is not a gallery location', async () => {
      const res = await submit(serviceBody({ location: 'Atlantis' }))
      expect(res.status).toBe(400)
      expect(res.body.error.fields).toEqual({ location: 'Choose one of our locations' })
      expect(await prisma.enquiry.count()).toBe(0)
    })

    it.each([
      ['an unpublished service', serviceBody({ slug: 'draft-service' })],
      ['an unknown service', serviceBody({ slug: 'nope' })],
      ['an unpublished artist', artistBody({ slug: 'draft-artist' })],
      ['an unknown artist', artistBody({ slug: 'nope' })],
    ])('404 for %s, storing nothing', async (_label, body) => {
      const res = await submit(body)
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
      expect(await prisma.enquiry.count()).toBe(0)
    })

    it('accepts a filled honeypot without storing it', async () => {
      const res = await submit(artistBody({ refCode: 'http://spam.example' }))
      expect(res.status).toBe(201)
      expect(res.body.data).toEqual({ received: true })
      expect(await prisma.enquiry.count()).toBe(0)
    })

    it('429 RATE_LIMITED after the per-address limit, without blocking sign-in', async () => {
      const input = enquiryInput()
      for (let attempt = 0; attempt < ENQUIRY_THROTTLE.limit; attempt += 1) await enquiriesService.submit(input, '203.0.113.5')
      await expect(enquiriesService.submit(input, '203.0.113.5')).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' })
      await expect(enquiriesService.submit(input, '203.0.113.6')).resolves.toEqual({ received: true })
      expect(await prisma.enquiry.count()).toBe(ENQUIRY_THROTTLE.limit + 1)
      await expect(loginAs('admin@example.test')).resolves.toEqual(expect.any(String))
    })

    it('counts one IPv6 /64 as one visitor, and different /64s separately', async () => {
      const input = enquiryInput()
      for (let attempt = 0; attempt < ENQUIRY_THROTTLE.limit; attempt += 1) {
        await enquiriesService.submit(input, `2001:db8:1:2:${attempt}::${attempt + 1}`)
      }
      await expect(enquiriesService.submit(input, '2001:db8:1:2:ffff::9')).rejects.toMatchObject({ status: 429 })
      await expect(enquiriesService.submit(input, '2001:db8:1:3::1')).resolves.toEqual({ received: true })
    })

    it('does not spend slots on unknown targets or unknown locations', async () => {
      for (let attempt = 0; attempt <= ENQUIRY_THROTTLE.limit; attempt += 1) {
        await expect(enquiriesService.submit(enquiryInput({ slug: 'nope' }), '203.0.113.7')).rejects.toMatchObject({ status: 404 })
        await expect(enquiriesService.submit(enquiryInput({ kind: 'SERVICE', slug: 'photo-shoots', ...stay, location: 'Atlantis' }), '203.0.113.7')).rejects.toMatchObject({ status: 400 })
      }
      await expect(enquiriesService.submit(enquiryInput(), '203.0.113.7')).resolves.toEqual({ received: true })
    })

    it('with an unknown client address (TRUST_PROXY=0) applies the site-wide cap, not the per-address limit', async () => {
      for (let attempt = 0; attempt < ENQUIRY_SITEWIDE_THROTTLE.limit; attempt += 1) {
        expect((await submit(artistBody())).status).toBe(201)
      }
      expect((await submit(artistBody())).status).toBe(429)
      expect(ENQUIRY_SITEWIDE_THROTTLE.limit).toBeGreaterThan(ENQUIRY_THROTTLE.limit * 5)
    })

    it('does not spend the limit on honeypot or invalid submissions', async () => {
      for (let attempt = 0; attempt < ENQUIRY_THROTTLE.limit + 2; attempt += 1) {
        await submit(artistBody({ refCode: 'x' }))
        await submit(artistBody({ email: 'bad' }))
      }
      expect((await submit(artistBody())).status).toBe(201)
    })

    it('403 BAD_ORIGIN when the request names no origin at all, unless the browser says same-origin', async () => {
      const bare = await submit(artistBody(), {})
      expect(bare.status).toBe(403)
      expect(bare.body.error.code).toBe('BAD_ORIGIN')
      expect((await submit(artistBody(), { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
      expect(await prisma.enquiry.count()).toBe(0)
      expect((await submit(artistBody(), { 'sec-fetch-site': 'same-origin' })).status).toBe(201)
    })

    it('413 for a body over the cap, declared or streamed, storing nothing', async () => {
      const oversized = JSON.stringify(artistBody({ message: 'x'.repeat(ENQUIRY_BODY_MAX_BYTES) }))
      const declared = await call('POST', PUBLIC_PATH, { raw: oversized, headers: { ...SITE_ORIGIN, 'content-type': 'application/json' } })
      expect(declared.status).toBe(413)
      expect(declared.body.error.code).toBe('PAYLOAD_TOO_LARGE')
      expect(JSON.stringify(declared.body)).not.toMatch(/video/i)
      const chunk = new TextEncoder().encode(oversized.slice(0, 4096))
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (let sent = 0; sent <= ENQUIRY_BODY_MAX_BYTES; sent += chunk.length) controller.enqueue(chunk)
          controller.close()
        },
      })
      const handler = (await import('@/app/api/public/enquiries/route')).POST
      const streamed = await handler(
        new Request('http://localhost/api/public/enquiries', { method: 'POST', headers: { ...SITE_ORIGIN, 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit),
        { params: Promise.resolve({}) },
      )
      expect(streamed.status).toBe(413)
      expect(await prisma.enquiry.count()).toBe(0)
    })

    it('400 for a body that is not JSON', async () => {
      const res = await call('POST', PUBLIC_PATH, { raw: '{nope', headers: { ...SITE_ORIGIN, 'content-type': 'application/json' } })
      expect(res.status).toBe(400)
    })

    it('403 BAD_ORIGIN for a cross-origin request, storing nothing; the site origin passes', async () => {
      const blocked = await submit(artistBody(), { origin: 'http://evil.example' })
      expect(blocked.status).toBe(403)
      expect(blocked.body.error.code).toBe('BAD_ORIGIN')
      expect(await prisma.enquiry.count()).toBe(0)
      expect((await submit(artistBody(), { origin: 'http://localhost' })).status).toBe(201)
    })

    it('hides internals and never logs the submission when storing fails', async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(prisma.enquiry, 'create').mockRejectedValueOnce(new Error('insert failed for asha@example.com 9876543210'))
      const res = await submit(artistBody())
      expect(res.status).toBe(500)
      expect(res.body).toEqual({ ok: false, data: null, error: { code: 'INTERNAL', message: 'Something went wrong' } })
      const output = JSON.stringify(logged.mock.calls)
      expect(output).toContain('Enquiry could not be saved')
      expect(output).not.toMatch(/asha|9876543210/i)
    })

    it('keeps the enquiry readable after its service or artist is deleted', async () => {
      await submit(serviceBody())
      await submit(artistBody())
      await prisma.service.delete({ where: { slug: 'photo-shoots' } })
      await prisma.artist.delete({ where: { slug: 'vijay' } })
      const rows = await prisma.enquiry.findMany({ orderBy: { kind: 'asc' } })
      expect(rows.map((r) => [r.kind, r.subject, r.serviceId, r.artistId])).toEqual([
        ['SERVICE', 'Photo shoots', null, null],
        ['ARTIST', 'Vijay Pichumani', null, null],
      ])
      const list = await api.get('/api/enquiries')
      expect(list.body.data.map((e: { subject: string; subjectRemoved: boolean }) => [e.subject, e.subjectRemoved])).toEqual(
        expect.arrayContaining([['Photo shoots', true], ['Vijay Pichumani', true]]),
      )
    })
  })

  describe('CMS endpoints', () => {
    async function seedEnquiries(count: number) {
      for (let index = 0; index < count; index += 1) {
        await prisma.enquiry.create({
          data: {
            kind: index % 2 === 0 ? 'ARTIST' : 'SERVICE', subject: `Subject ${index}`, name: `Person ${index}`, email: 'p@example.com',
            mobile: '+919876543210', createdAt: new Date(Date.UTC(2026, 10, 1 + index)),
          },
        })
      }
    }

    it.each([
      ['GET', '/api/enquiries', undefined],
      ['PATCH', `/api/enquiries/${UNKNOWN_ID}`, { isHandled: true }],
      ['DELETE', `/api/enquiries/${UNKNOWN_ID}`, undefined],
    ])('401 without a session: %s %s', async (method, path, body) => {
      const res = await call(method, path, body === undefined ? {} : { body })
      expect(res.status).toBe(401)
    })

    it('lists newest first with pagination meta and the full detail', async () => {
      await seedEnquiries(3)
      const res = await api.get('/api/enquiries')
      expect(res.status).toBe(200)
      expect(res.body.data.map((e: { subject: string }) => e.subject)).toEqual(['Subject 2', 'Subject 1', 'Subject 0'])
      expect(res.body.meta).toEqual({ page: 1, limit: 50, total: 3 })
      expect(res.body.data[0]).toEqual({
        id: expect.any(String), kind: 'ARTIST', subject: 'Subject 2', subjectRemoved: true, name: 'Person 2', email: 'p@example.com',
        mobile: '+919876543210', message: '', dateFrom: null, dateTo: null, purpose: null, location: null, isHandled: false,
        createdAt: '2026-11-03T00:00:00.000Z',
      })
    })

    it('includes service details in the list rows', async () => {
      await submit(serviceBody())
      const [row] = (await api.get('/api/enquiries')).body.data
      expect(row).toMatchObject({ kind: 'SERVICE', subjectRemoved: false, dateFrom: day(3), dateTo: day(5), purpose: 'Photography', location: 'Chennai' })
    })

    it('filters by kind and paginates', async () => {
      await seedEnquiries(5)
      const artists = await api.get('/api/enquiries?kind=ARTIST')
      expect(artists.body.data.map((e: { subject: string }) => e.subject)).toEqual(['Subject 4', 'Subject 2', 'Subject 0'])
      expect(artists.body.meta.total).toBe(3)
      const page2 = await api.get('/api/enquiries?limit=2&page=2')
      expect(page2.body.data.map((e: { subject: string }) => e.subject)).toEqual(['Subject 2', 'Subject 1'])
      expect(page2.body.meta).toEqual({ page: 2, limit: 2, total: 5 })
    })

    it('400 on an unknown kind filter', async () => {
      expect((await api.get('/api/enquiries?kind=NEWS')).status).toBe(400)
    })

    it('marks an enquiry handled and unhandled', async () => {
      await seedEnquiries(1)
      const { id } = await prisma.enquiry.findFirstOrThrow()
      const handled = await api.patch(`/api/enquiries/${id}`, { isHandled: true })
      expect(handled.status).toBe(200)
      expect(handled.body.data).toMatchObject({ id, isHandled: true })
      expect((await prisma.enquiry.findUniqueOrThrow({ where: { id } })).isHandled).toBe(true)
      expect((await api.patch(`/api/enquiries/${id}`, { isHandled: false })).body.data.isHandled).toBe(false)
    })

    it('400 for an invalid handled body and 404 for an unknown id', async () => {
      await seedEnquiries(1)
      const { id } = await prisma.enquiry.findFirstOrThrow()
      expect((await api.patch(`/api/enquiries/${id}`, { isHandled: 'yes' })).status).toBe(400)
      expect((await api.patch(`/api/enquiries/${UNKNOWN_ID}`, { isHandled: true })).status).toBe(404)
    })

    it('deletes an enquiry and 404s on a second delete', async () => {
      await seedEnquiries(2)
      const { id } = await prisma.enquiry.findFirstOrThrow()
      const res = await api.del(`/api/enquiries/${id}`)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({ id })
      expect(await prisma.enquiry.count()).toBe(1)
      expect((await api.del(`/api/enquiries/${id}`)).status).toBe(404)
    })

    it('lets an editor work the queue, like every other CMS delete', async () => {
      await seedUser({ email: 'editor@example.test', role: 'EDITOR' })
      const editor = authedClient(() => editorCookie)
      const editorCookie = await loginAs('editor@example.test')
      await seedEnquiries(1)
      const { id } = await prisma.enquiry.findFirstOrThrow()
      expect((await editor.get('/api/enquiries')).status).toBe(200)
      expect((await editor.patch(`/api/enquiries/${id}`, { isHandled: true })).status).toBe(200)
      expect((await editor.del(`/api/enquiries/${id}`)).status).toBe(200)
    })

    it('refuses a cross-origin delete', async () => {
      await seedEnquiries(1)
      const { id } = await prisma.enquiry.findFirstOrThrow()
      const res = await call('DELETE', `/api/enquiries/${id}`, { cookie: `ah_session=${cookie}`, headers: { origin: 'http://evil.example' } })
      expect(res.status).toBe(403)
      expect(await prisma.enquiry.count()).toBe(1)
    })
  })
})
