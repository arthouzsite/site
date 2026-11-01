import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './memory.storage'
import { RangeNotSatisfiableError } from './storage.interface'

describe('MemoryStorage', () => {
  const bytes = Buffer.from('0123456789')

  it('hands out the same-origin PUT route as the upload target', async () => {
    const target = await new MemoryStorage().createUploadTarget('arthouz/2026/a.png', 'image/png', 10)
    expect(target).toMatchObject({ url: '/api/media/uploads/arthouz/2026/a.png', method: 'PUT', headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } })
    expect(new Date(target.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('publicUrlFor is the same-origin media url', async () => {
    await expect(new MemoryStorage().publicUrlFor('arthouz/2026/a.png')).resolves.toBe('/media/arthouz/2026/a.png')
  })

  it('remembers the declared size per key', async () => {
    const storage = new MemoryStorage()
    await storage.createUploadTarget('a.png', 'image/png', 10)
    expect(storage.declaredSize('a.png')).toBe(10)
    expect(storage.declaredSize('b.png')).toBeUndefined()
  })

  it('head reports size and type, or null when missing', async () => {
    const storage = new MemoryStorage()
    await storage.put('a.png', bytes, 'image/png')
    await expect(storage.head('a.png')).resolves.toEqual({ bytes: 10, contentType: 'image/png' })
    await expect(storage.head('missing')).resolves.toBeNull()
  })

  it('get and getRange read the stored bytes, the range inclusive', async () => {
    const storage = new MemoryStorage()
    await storage.put('a.png', bytes, 'image/png')
    await expect(storage.get('a.png')).resolves.toEqual(bytes)
    await expect(storage.getRange('a.png', 2, 4)).resolves.toEqual(Buffer.from('234'))
    await expect(storage.getRange('a.png', 0, 65535)).resolves.toEqual(bytes)
  })

  it('get and getRange throw for a missing object', async () => {
    const storage = new MemoryStorage()
    await expect(storage.get('missing')).rejects.toThrow(/missing/)
    await expect(storage.getRange('missing', 0, 1)).rejects.toThrow(/missing/)
  })

  it('urlFor is the same-origin media path, matching the url put returns', async () => {
    const storage = new MemoryStorage()
    expect(storage.urlFor('arthouz/a.png')).toBe('/media/arthouz/a.png')
    await expect(storage.put('arthouz/a.png', bytes, 'image/png')).resolves.toEqual({ url: '/media/arthouz/a.png' })
    expect(new MemoryStorage('https://cdn.example.test/').urlFor('a.png')).toBe('https://cdn.example.test/a.png')
  })

  describe('getStream', () => {
    const read = async (stream: ReadableStream<Uint8Array>) => Buffer.from(await new Response(stream).arrayBuffer()).toString()

    it('streams the whole object with its type and length', async () => {
      const storage = new MemoryStorage()
      await storage.put('a.png', bytes, 'image/png')
      const result = await storage.getStream('a.png')
      expect(result).toMatchObject({ contentType: 'image/png', contentLength: 10, range: undefined })
      expect(await read(result!.body)).toBe('0123456789')
    })

    it('slices closed, open-ended and suffix ranges and reports them', async () => {
      const storage = new MemoryStorage()
      await storage.put('a.png', bytes, 'image/png')
      const closed = await storage.getStream('a.png', { start: 2, end: 4 })
      expect(closed).toMatchObject({ contentLength: 3, range: { start: 2, end: 4, total: 10 } })
      expect(await read(closed!.body)).toBe('234')
      expect(await read((await storage.getStream('a.png', { start: 7 }))!.body)).toBe('789')
      expect(await read((await storage.getStream('a.png', { suffix: 2 }))!.body)).toBe('89')
    })

    it('is null for a missing object and throws RangeNotSatisfiableError past the end', async () => {
      const storage = new MemoryStorage()
      await expect(storage.getStream('missing')).resolves.toBeNull()
      await storage.put('a.png', bytes, 'image/png')
      await expect(storage.getStream('a.png', { start: 10 })).rejects.toEqual(new RangeNotSatisfiableError(10))
    })
  })
})
