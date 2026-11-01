import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './memory.storage'

describe('MemoryStorage', () => {
  const bytes = Buffer.from('0123456789')

  it('hands out the same-origin PUT route as the upload target', async () => {
    const target = await new MemoryStorage().createUploadTarget('arthouz/2026/a.png', 'image/png', 10)
    expect(target).toMatchObject({ url: '/api/media/uploads/arthouz/2026/a.png', method: 'PUT', headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } })
    expect(new Date(target.expiresAt).getTime()).toBeGreaterThan(Date.now())
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

  it('urlFor matches the url put returns', async () => {
    const storage = new MemoryStorage()
    await expect(storage.put('a.png', bytes, 'image/png')).resolves.toEqual({ url: storage.urlFor('a.png') })
  })
})
