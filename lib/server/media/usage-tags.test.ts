import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'
import { mediaUsageTags } from './usage-tags'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

function fakePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  const rows = (value: unknown[]) => ({ findMany: vi.fn(async () => value) })
  return {
    exhibition: rows([{ slug: 'sea', artists: [{ artist: { slug: 'ada' } }] }]),
    exhibitionWork: rows([{ exhibition: { slug: 'sea' }, artist: { slug: 'bo' } }]),
    artist: rows([{ slug: 'cy', exhibitions: [{ exhibition: { slug: 'lake' } }] }]),
    artwork: rows([{ artist: { slug: 'di' } }]),
    service: rows([{ slug: 'framing' }]),
    ...overrides,
  } as unknown as PrismaClient
}

const usage = (type: string) => [{ type, id: 'x', title: 'T' }]

describe('mediaUsageTags', () => {
  it('returns no tags for unused media', async () => {
    expect(await mediaUsageTags(fakePrisma(), [])).toEqual([])
  })

  it.each([
    ['exhibition', ['exhibition:sea', 'artist:ada']],
    ['exhibitionWork', ['exhibition:sea', 'artist:bo']],
    ['artist', ['artist:cy', 'exhibition:lake']],
    ['artwork', ['artist:di']],
    ['service', ['service:framing']],
  ])('resolves %s usage to the pages that render it', async (type, expected) => {
    expect(await mediaUsageTags(fakePrisma(), usage(type))).toEqual(expect.arrayContaining(expected))
  })

  it.each([
    ['fair', 'fairs'],
    ['news', 'news'],
    ['location', 'locations'],
    ['setting', 'settings'],
  ])('uses the static tags for %s usage', async (type, tag) => {
    expect(await mediaUsageTags(fakePrisma(), usage(type))).toContain(tag)
  })

  it('merges several usages without duplicates', async () => {
    const tags = await mediaUsageTags(fakePrisma(), [...usage('exhibition'), ...usage('exhibitionWork')])
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('logs and skips a failed lookup while keeping the others', async () => {
    const prisma = fakePrisma({ exhibition: { findMany: vi.fn().mockRejectedValue(new Error('db down')) } })
    const tags = await mediaUsageTags(prisma, [...usage('exhibition'), ...usage('fair')])
    expect(tags).toContain('fairs')
    expect(tags).not.toContain('exhibition:sea')
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('media usage exhibition'))
  })
})
