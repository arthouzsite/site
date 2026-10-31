import { describe, expect, it, vi } from 'vitest'
import { resolveImages, toPublicImage } from './public.images'

const fake = vi.hoisted(() => ({ media: { findMany: vi.fn() } }))
vi.mock('@/lib/server/prisma', () => ({ prisma: fake }))

describe('resolveImages', () => {
  it('only resolves IMAGE media so a video id never reaches the public payload', async () => {
    fake.media.findMany.mockResolvedValue([])
    await resolveImages(['a', 'a', null, 'b'])
    expect(fake.media.findMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] }, kind: 'IMAGE' } })
  })

  it('skips the query when there are no ids', async () => {
    fake.media.findMany.mockClear()
    await resolveImages([null, undefined])
    expect(fake.media.findMany).not.toHaveBeenCalled()
  })

  it('maps resolved rows by id to the public image shape', async () => {
    const row = { id: 'a', key: 'k', url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'x' }
    fake.media.findMany.mockResolvedValue([row])
    const images = await resolveImages(['a'])
    expect(images.get('a')).toEqual({ url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'x' })
  })
})

describe('toPublicImage', () => {
  it('returns null for a missing media row', () => {
    expect(toPublicImage(null)).toBeNull()
    expect(toPublicImage(undefined)).toBeNull()
  })
})
