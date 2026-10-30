import type { PrismaService } from '../common/prisma.service'
import { resolveImages } from './public.images'

describe('resolveImages', () => {
  it('only resolves IMAGE media so a video id never reaches the public payload', async () => {
    const findMany = jest.fn(async (_args: unknown) => [])
    const prisma = { media: { findMany } } as unknown as PrismaService
    await resolveImages(prisma, ['a', 'a', null, 'b'])
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] }, kind: 'IMAGE' } })
  })

  it('skips the query when there are no ids', async () => {
    const findMany = jest.fn()
    await resolveImages({ media: { findMany } } as unknown as PrismaService, [null, undefined])
    expect(findMany).not.toHaveBeenCalled()
  })
})
