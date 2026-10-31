import { describe, expect, it } from 'vitest'
import type { Media } from '@/lib/server/generated/prisma/client'
import { toImage } from './image.mapper'

describe('toImage', () => {
  it('returns null for a missing media row', () => {
    expect(toImage(null)).toBeNull()
  })

  it('keeps only the public image fields', () => {
    const media = {
      id: 'm1', url: 'https://cdn.example/a.jpg', thumbUrl: 'https://cdn.example/a-t.jpg', width: 10, height: 20, alt: 'A',
      key: 'secret/key', kind: 'IMAGE',
    } as unknown as Media
    expect(toImage(media)).toEqual({ id: 'm1', url: 'https://cdn.example/a.jpg', thumbUrl: 'https://cdn.example/a-t.jpg', width: 10, height: 20, alt: 'A' })
  })
})
