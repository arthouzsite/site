import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { uniqueSlug } from './slugs'

function fakePrisma(taken: string[]): PrismaClient {
  return {
    exhibition: {
      findFirst: async ({ where }: { where: { slug: string } }) => (taken.includes(where.slug) ? { id: 'x' } : null),
    },
  } as unknown as PrismaClient
}

describe('uniqueSlug', () => {
  it('slugifies a free base', async () => {
    expect(await uniqueSlug(fakePrisma([]), 'exhibition', 'Tide Water!')).toBe('tide-water')
  })
  it('appends -2 then -3 on collisions', async () => {
    expect(await uniqueSlug(fakePrisma(['tidewater']), 'exhibition', 'Tidewater')).toBe('tidewater-2')
    expect(await uniqueSlug(fakePrisma(['tidewater', 'tidewater-2']), 'exhibition', 'Tidewater')).toBe('tidewater-3')
  })
  it('falls back to untitled for an empty base', async () => {
    expect(await uniqueSlug(fakePrisma([]), 'exhibition', '  !!! ')).toBe('untitled')
  })
  it('excludes the given id from the collision query', async () => {
    const seen: unknown[] = []
    const prisma = {
      exhibition: { findFirst: async (a: unknown) => (seen.push(a), null) },
    } as unknown as PrismaClient
    await uniqueSlug(prisma, 'exhibition', 'a', 'id-1')
    expect(seen[0]).toMatchObject({ where: { slug: 'a', id: { not: 'id-1' } } })
  })
})
