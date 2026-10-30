import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../common/prisma.service'
import { UsersService } from './users.service'

type Target = { role: 'ADMIN' | 'EDITOR'; isDisabled: boolean } | null

function build(target: Target, otherEnabledAdmins: number) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: {
      findUnique: jest.fn().mockResolvedValue(target),
      count: jest.fn().mockResolvedValue(otherEnabledAdmins),
      update: jest.fn().mockResolvedValue({ id: 'target' }),
      delete: jest.fn().mockResolvedValue({}),
    },
  }
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaService
  return { service: new UsersService(prisma), tx }
}

const ENABLED_ADMIN: Target = { role: 'ADMIN', isDisabled: false }

describe('UsersService lockout guards', () => {
  it('locks admin rows and counts the other enabled admins inside a transaction', async () => {
    const { service, tx } = build(ENABLED_ADMIN, 1)
    await service.update('target', { role: 'EDITOR' }, 'actor')
    expect(tx.$queryRaw).toHaveBeenCalled()
    expect(tx.user.count).toHaveBeenCalledWith({ where: { role: 'ADMIN', isDisabled: false, id: { not: 'target' } } })
    expect(tx.user.update).toHaveBeenCalled()
  })

  it.each([[{ role: 'EDITOR' as const }], [{ isDisabled: true }]])('refuses %j when it would leave no enabled admin -> LAST_ADMIN', async (patch) => {
    const { service, tx } = build(ENABLED_ADMIN, 0)
    await expect(service.update('target', patch, 'actor')).rejects.toMatchObject({
      status: 409,
      response: { code: 'LAST_ADMIN' },
    })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('refuses deleting the last enabled admin', async () => {
    const { service, tx } = build(ENABLED_ADMIN, 0)
    await expect(service.remove('target', 'actor')).rejects.toBeInstanceOf(ConflictException)
    expect(tx.user.delete).not.toHaveBeenCalled()
  })

  it('deletes an admin when another enabled admin remains', async () => {
    const { service, tx } = build(ENABLED_ADMIN, 1)
    await expect(service.remove('target', 'actor')).resolves.toEqual({ id: 'target' })
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'target' } })
  })

  it('does not count admins when the target is an editor or already disabled', async () => {
    for (const target of [{ role: 'EDITOR' as const, isDisabled: false }, { role: 'ADMIN' as const, isDisabled: true }]) {
      const { service, tx } = build(target, 0)
      await service.update('target', { isDisabled: true }, 'actor')
      expect(tx.user.count).not.toHaveBeenCalled()
    }
  })

  it('refuses a self role change or self disable -> SELF_LOCKOUT, but allows an unchanged role', async () => {
    const { service, tx } = build(ENABLED_ADMIN, 5)
    await expect(service.update('me', { role: 'EDITOR' }, 'me')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.update('me', { isDisabled: true }, 'me')).rejects.toMatchObject({ response: { code: 'SELF_LOCKOUT' } })
    expect(tx.user.update).not.toHaveBeenCalled()
    await service.update('me', { role: 'ADMIN', isDisabled: false, name: 'Me' }, 'me')
    expect(tx.user.update).toHaveBeenCalledTimes(1)
  })

  it('404s an unknown user', async () => {
    const { service } = build(null, 0)
    await expect(service.update('nope', { name: 'x' }, 'actor')).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.remove('nope', 'actor')).rejects.toBeInstanceOf(NotFoundException)
  })
})
