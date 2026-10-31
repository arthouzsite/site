import { describe, expect, test } from 'vitest'
import {
  publicSearchSchema, publicServiceListSchema, publicServiceSchema, servicePatchSchema, serviceInputSchema, tagsFor,
} from '../index'

const id = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'
const parse = (over: Record<string, unknown>) => serviceInputSchema.safeParse({ title: 'Art sales', ...over })

describe('serviceInputSchema', () => {
  test('applies defaults', () => {
    expect(serviceInputSchema.parse({ title: 'Art sales' })).toEqual({
      title: 'Art sales', summary: '', body: '', imageId: null, ctaLabel: 'Enquire →', ctaHref: '',
      contactName: '', contactPhone: '', contactEmail: '', isPublished: false,
    })
  })
  test('title is required and capped at 200', () => {
    expect(serviceInputSchema.safeParse({}).success).toBe(false)
    expect(parse({ title: '' }).success).toBe(false)
    expect(parse({ title: 'x'.repeat(201) }).success).toBe(false)
    expect(parse({ title: 'x'.repeat(200) }).success).toBe(true)
  })
  test('length caps', () => {
    expect(parse({ summary: 'x'.repeat(401) }).success).toBe(false)
    expect(parse({ summary: 'x'.repeat(400) }).success).toBe(true)
    expect(parse({ body: 'x'.repeat(20001) }).success).toBe(false)
    expect(parse({ contactName: 'x'.repeat(121) }).success).toBe(false)
    expect(parse({ ctaLabel: '' }).success).toBe(false)
    expect(parse({ ctaLabel: 'x'.repeat(61) }).success).toBe(false)
  })
  test('imageId is a uuid or null', () => {
    expect(parse({ imageId: id }).success).toBe(true)
    expect(parse({ imageId: null }).success).toBe(true)
    expect(parse({ imageId: 'nope' }).success).toBe(false)
  })
  test.each([
    ['', true],
    ['https://example.com/enquire', true],
    ['http://example.com', true],
    ['mailto:sales@arthouz.com', true],
    ['mailto:sales@arthouz.com?subject=Hello', true],
    ['tel:+914412345678', true],
    ['javascript:alert(1)', false],
    ['data:text/html,x', false],
    ['/visit', false],
    ['mailto:', false],
    ['mailto:not-an-email', false],
    ['tel:044 1234', false],
    ['tel:+1234567', false],
    ['tel:', false],
  ])('ctaHref %j -> %s', (ctaHref, ok) => {
    expect(parse({ ctaHref }).success).toBe(ok)
  })
  test('contact phone and email', () => {
    expect(parse({ contactPhone: '+914412345678' }).success).toBe(true)
    expect(parse({ contactPhone: '' }).success).toBe(true)
    expect(parse({ contactPhone: '044 1234' }).success).toBe(false)
    expect(parse({ contactEmail: 'sales@arthouz.com' }).success).toBe(true)
    expect(parse({ contactEmail: '' }).success).toBe(true)
    expect(parse({ contactEmail: 'nope' }).success).toBe(false)
  })
  test('slug follows the shared slug rule', () => {
    expect(parse({ slug: 'art-sales' }).success).toBe(true)
    expect(parse({ slug: '' }).success).toBe(false)
  })
})

describe('servicePatchSchema', () => {
  test('is truly partial: omitted fields stay omitted', () => {
    expect(servicePatchSchema.parse({})).toEqual({})
    expect(servicePatchSchema.parse({ summary: 'New' })).toEqual({ summary: 'New' })
  })
  test('still validates supplied fields and ignores isPublished', () => {
    expect(servicePatchSchema.safeParse({ ctaHref: 'javascript:alert(1)' }).success).toBe(false)
    expect(servicePatchSchema.safeParse({ title: '' }).success).toBe(false)
    expect(servicePatchSchema.parse({ isPublished: true })).toEqual({})
  })
})

describe('public service schemas', () => {
  const service = {
    slug: 'art-sales', title: 'Art sales', summary: 's', body: 'b', image: null,
    ctaLabel: 'Enquire →', ctaHref: '', contact: { name: '', phone: '', email: '' },
  }
  test('parse a service and a list', () => {
    expect(publicServiceSchema.safeParse(service).success).toBe(true)
    expect(publicServiceListSchema.safeParse([service]).success).toBe(true)
    expect(publicServiceSchema.safeParse({ ...service, contact: undefined }).success).toBe(false)
  })
  test('search accepts a Services group', () => {
    expect(publicSearchSchema.safeParse({ groups: [{ label: 'Services', items: [{ label: 'Art sales', href: '/services/art-sales' }] }] }).success).toBe(true)
  })
})

describe('tagsFor service', () => {
  test('list and detail tags', () => {
    expect(tagsFor('service', 'art-sales')).toEqual(['home', 'search', 'services', 'service:art-sales'])
    expect(tagsFor('service')).toEqual(['home', 'search', 'services'])
  })
})
