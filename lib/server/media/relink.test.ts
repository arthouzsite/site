import { describe, expect, it, vi } from 'vitest'
import { formatRelinkSummary, relinkMedia, type RelinkDb, type RelinkRow } from './relink'
import { MemoryStorage } from './storage/memory.storage'

const OLD_HOST = 'https://old-bucket.example.test'

function fakeDb(rows: RelinkRow[]) {
  const update = vi.fn(async () => ({}))
  const db: RelinkDb = { media: { findMany: vi.fn(async () => rows), update } }
  return { db, update }
}

async function storageWith(...keys: string[]): Promise<MemoryStorage> {
  const storage = new MemoryStorage()
  for (const key of keys) await storage.put(key, Buffer.from('x'), 'image/jpeg')
  return storage
}

const image = (id: string, key: string, over: Partial<RelinkRow> = {}): RelinkRow => ({
  id,
  key,
  url: `${OLD_HOST}/${key}`,
  thumbUrl: `${OLD_HOST}/${key.replace(/\.[^.]+$/, '-thumb.webp')}`,
  kind: 'IMAGE',
  ...over,
})

describe('relinkMedia', () => {
  it('rewrites only rows whose objects exist, original and thumb', async () => {
    const storage = await storageWith('arthouz/seed/a.jpg', 'arthouz/seed/a-thumb.webp', 'arthouz/seed/nothumb.jpg')
    const { db, update } = fakeDb([
      image('1', 'arthouz/seed/a.jpg'),
      image('2', 'arthouz/seed/gone.jpg'),
      image('3', 'arthouz/seed/nothumb.jpg'),
    ])

    const summary = await relinkMedia(db, storage)

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { url: '/media/arthouz/seed/a.jpg', thumbUrl: '/media/arthouz/seed/a-thumb.webp' },
    })
    expect(summary).toEqual({ relinked: 1, alreadyRelative: 0, missingInBucket: 2, missingKeys: ['arthouz/seed/gone.jpg', 'arthouz/seed/nothumb.jpg'] })
  })

  it('is idempotent: rows already on the media path are counted and not touched or looked up', async () => {
    const storage = await storageWith()
    const head = vi.spyOn(storage, 'head')
    const { db, update } = fakeDb([
      image('1', 'arthouz/seed/a.jpg', { url: '/media/arthouz/seed/a.jpg', thumbUrl: '/media/arthouz/seed/a-thumb.webp' }),
      image('2', 'arthouz/2026/11/clip.mp4', { kind: 'VIDEO', url: '/media/arthouz/2026/11/clip.mp4', thumbUrl: '/media/arthouz/2026/11/clip.mp4' }),
    ])

    const summary = await relinkMedia(db, storage)

    expect(summary).toEqual({ relinked: 0, alreadyRelative: 2, missingInBucket: 0, missingKeys: [] })
    expect(update).not.toHaveBeenCalled()
    expect(head).not.toHaveBeenCalled()
  })

  it('points a video thumbUrl at the video itself and checks only the video object', async () => {
    const key = 'arthouz/2026/11/clip.mp4'
    const storage = await storageWith(key)
    const { db, update } = fakeDb([image('v', key, { kind: 'VIDEO', url: `${OLD_HOST}/${key}`, thumbUrl: `${OLD_HOST}/${key}` })])

    const summary = await relinkMedia(db, storage)

    expect(update).toHaveBeenCalledWith({ where: { id: 'v' }, data: { url: `/media/${key}`, thumbUrl: `/media/${key}` } })
    expect(summary.relinked).toBe(1)
  })

  it('rewrites a row left on an older media base', async () => {
    const storage = await storageWith('arthouz/seed/a.jpg', 'arthouz/seed/a-thumb.webp')
    const { db, update } = fakeDb([image('1', 'arthouz/seed/a.jpg', { url: '/old/arthouz/seed/a.jpg', thumbUrl: '/old/arthouz/seed/a-thumb.webp' })])
    expect((await relinkMedia(db, storage)).relinked).toBe(1)
    expect(update).toHaveBeenCalledTimes(1)
  })
})

describe('formatRelinkSummary', () => {
  it('prints the three counts', () => {
    expect(formatRelinkSummary({ relinked: 70, alreadyRelative: 2, missingInBucket: 0, missingKeys: [] })).toBe('relinked 70, already relative 2, missing in bucket 0')
  })
})
