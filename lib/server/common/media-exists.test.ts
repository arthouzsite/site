import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { ApiException } from '@/lib/server/http/errors'
import { assertMediaExists } from './media-exists'

function prismaReturning(row: { id: string; kind: 'IMAGE' | 'VIDEO' } | null) {
  const findUnique = vi.fn<(args: unknown) => Promise<typeof row>>(async () => row)
  return { prisma: { media: { findUnique } } as unknown as PrismaClient, findUnique }
}

describe('assertMediaExists', () => {
  it('skips the lookup for empty ids', async () => {
    const { prisma, findUnique } = prismaReturning(null)
    await assertMediaExists(prisma, null)
    await assertMediaExists(prisma, undefined)
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('selects id and kind and accepts an image', async () => {
    const { prisma, findUnique } = prismaReturning({ id: 'm1', kind: 'IMAGE' })
    await expect(assertMediaExists(prisma, 'm1')).resolves.toBeUndefined()
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'm1' }, select: { id: true, kind: true } })
  })

  it('throws UNKNOWN_MEDIA for a missing row', async () => {
    const { prisma } = prismaReturning(null)
    const error = await assertMediaExists(prisma, 'm1', 'hero image').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiException)
    expect(error).toMatchObject({ status: 400, code: 'UNKNOWN_MEDIA', message: 'Unknown hero image: m1' })
  })

  it('throws INVALID_MEDIA_KIND for a video', async () => {
    const { prisma } = prismaReturning({ id: 'm1', kind: 'VIDEO' })
    const error = await assertMediaExists(prisma, 'm1', 'hero image').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiException)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_MEDIA_KIND', message: 'hero image must be an image' })
  })
})
