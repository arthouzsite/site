import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { findMediaUsage } from './media.usage'

const rows = (value: unknown[]) => ({ findMany: vi.fn(async () => value) })

function fakePrisma(settings: Array<{ key: string; value: unknown }> = []): PrismaClient {
  return {
    exhibition: rows([{ id: 'e1', title: 'Sea' }]),
    exhibitionWork: rows([{ id: 'w1', title: 'Work' }]),
    artist: rows([{ id: 'a1', name: 'Ada' }]),
    artwork: rows([{ id: 'k1', title: 'Piece' }]),
    fair: rows([{ id: 'f1', title: 'Fair' }]),
    fairImage: rows([{ fair: { id: 'f2', title: 'Gallery fair' } }]),
    printImage: rows([{ category: { id: 'p1', name: 'Etchings' } }]),
    service: rows([{ id: 's1', title: 'Framing' }]),
    news: rows([{ id: 'n1', title: 'News' }]),
    location: rows([{ id: 'l1', city: 'Dubai' }]),
    setting: rows(settings),
  } as unknown as PrismaClient
}

describe('findMediaUsage', () => {
  it('labels every referencing model', async () => {
    expect(await findMediaUsage(fakePrisma(), 'm1')).toEqual([
      { type: 'exhibition', id: 'e1', title: 'Sea' },
      { type: 'exhibitionWork', id: 'w1', title: 'Work' },
      { type: 'artist', id: 'a1', title: 'Ada' },
      { type: 'artwork', id: 'k1', title: 'Piece' },
      { type: 'fair', id: 'f1', title: 'Fair' },
      { type: 'fairGallery', id: 'f2', title: 'Gallery fair' },
      { type: 'print', id: 'p1', title: 'Etchings' },
      { type: 'service', id: 's1', title: 'Framing' },
      { type: 'news', id: 'n1', title: 'News' },
      { type: 'location', id: 'l1', title: 'Dubai' },
    ])
  })

  it('names only the settings that embed this media id', async () => {
    const settings = [
      { key: 'homeFocus', value: { imageId: 'm1' } },
      { key: 'site', value: { ogImageId: 'other' } },
      { key: 'about.gallery', value: null },
      { key: 'about.services', value: 'text' },
    ]
    const usage = await findMediaUsage(fakePrisma(settings), 'm1')
    expect(usage.filter((u) => u.type === 'setting')).toEqual([{ type: 'setting', id: 'homeFocus', title: 'Home focus' }])
  })
})
