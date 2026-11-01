import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from '@/lib/server/log'
import { presentMediaUrls } from './present-urls'
import { MemoryStorage } from './storage/memory.storage'
import { setStorageForTests } from './storage/storage.provider'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

const KEY = 'arthouz/2026/10/0a1b2c3d-0a1b-4c3d-8e9f-0a1b2c3d4e5f.jpg'
const THUMB_KEY = 'arthouz/2026/10/0a1b2c3d-0a1b-4c3d-8e9f-0a1b2c3d4e5f-thumb.webp'

class SigningStorage extends MemoryStorage {
  override async publicUrlFor(key: string): Promise<string> {
    return `https://signed.test/${key}?sig=1`
  }
}

describe('presentMediaUrls', () => {
  afterEach(() => setStorageForTests(undefined))

  describe('with a signing driver', () => {
    beforeEach(() => setStorageForTests(new SigningStorage()))

    it('rewrites nested url and thumbUrl fields and arrays', async () => {
      const input = { items: [{ title: 'a', image: { url: `/media/${KEY}`, thumbUrl: `/media/${THUMB_KEY}`, width: 10 } }], hero: null }
      expect(await presentMediaUrls(input)).toEqual({
        items: [{ title: 'a', image: { url: `https://signed.test/${KEY}?sig=1`, thumbUrl: `https://signed.test/${THUMB_KEY}?sig=1`, width: 10 } }],
        hero: null,
      })
    })

    it('leaves other strings, absolute URLs and unservable keys alone', async () => {
      const input = ['/media/other/x.jpg', '/media/arthouz/../secret.jpg', '/media/arthouz/2026/x.exe', 'https://picsum.photos/1.jpg', `see /media/${KEY}`, 7, true, null]
      expect(await presentMediaUrls(input)).toEqual(input)
    })

    it('does not mutate its input and returns new containers', async () => {
      const input = Object.freeze({ list: Object.freeze([Object.freeze({ url: `/media/${KEY}` })]) })
      const output = await presentMediaUrls(input)
      expect(input.list[0]!.url).toBe(`/media/${KEY}`)
      expect(output).not.toBe(input)
      expect(output.list).not.toBe(input.list)
    })

    it('is idempotent: a presented value presents to itself', async () => {
      const once = await presentMediaUrls({ url: `/media/${KEY}` })
      expect(await presentMediaUrls(once)).toEqual(once)
    })

    it('passes dates through untouched', async () => {
      const date = new Date('2026-01-01T00:00:00Z')
      expect((await presentMediaUrls({ date })).date).toBe(date)
    })
  })

  it('falls back to the /media url and logs once per key when signing throws', async () => {
    class FailingStorage extends MemoryStorage {
      override async publicUrlFor(): Promise<string> {
        throw new Error('no credentials')
      }
    }
    setStorageForTests(new FailingStorage())
    vi.mocked(logError).mockClear()
    const input = { a: { url: `/media/${KEY}` }, b: [{ url: `/media/${KEY}` }, { url: `/media/${KEY}` }] }

    await expect(presentMediaUrls(input)).resolves.toEqual(input)
    await expect(presentMediaUrls(input)).resolves.toEqual(input)

    expect(logError).toHaveBeenCalledTimes(1)
    expect(vi.mocked(logError).mock.calls[0]![0]).toContain(KEY)
  })

  it('keeps /media paths under the memory driver', async () => {
    setStorageForTests(new MemoryStorage())
    const input = { url: `/media/${KEY}`, nested: [{ thumbUrl: `/media/${THUMB_KEY}` }] }
    expect(await presentMediaUrls(input)).toEqual(input)
  })
})
