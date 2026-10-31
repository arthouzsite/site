import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { remove, update } from './users.service'

type Target = { role: 'ADMIN' | 'EDITOR'; isDisabled: boolean } | null

const tx = {
  $queryRaw: vi.fn(),
  user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
}

vi.mock('@/lib/server/prisma', () => ({ prisma: { $transaction: vi.fn() } }))
vi.mock('@/lib/server/auth/password', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }))

function arrange(target: Target, otherEnabledAdmins: number) {
  tx.$queryRaw.mockResolvedValue([])
  tx.user.findUnique.mockResolvedValue(target)
  tx.user.count.mockResolvedValue(otherEnabledAdmins)
  tx.user.update.mockResolvedValue({ id: 'target' })
  tx.user.delete.mockResolvedValue({})
}

const ENABLED_ADMIN: Target = { role: 'ADMIN', isDisabled: false }

describe('users service lockout guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: (t: typeof tx) => unknown) => fn(tx)) as never)
  })

  it('locks admin rows and counts the other enabled admins inside a transaction', async () => {
    arrange(ENABLED_ADMIN, 1)
    await update('target', { role: 'EDITOR' }, 'actor')
    expect(tx.$queryRaw).toHaveBeenCalled()
    expect(tx.user.count).toHaveBeenCalledWith({ where: { role: 'ADMIN', isDisabled: false, id: { not: 'target' } } })
    expect(tx.user.update).toHaveBeenCalled()
  })

  it.each([[{ role: 'EDITOR' as const }], [{ isDisabled: true }]])('refuses %j when it would leave no enabled admin -> LAST_ADMIN', async (patch) => {
    arrange(ENABLED_ADMIN, 0)
    await expect(update('target', patch, 'actor')).rejects.toMatchObject({ status: 409, code: 'LAST_ADMIN' })
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('refuses deleting the last enabled admin', async () => {
    arrange(ENABLED_ADMIN, 0)
    await expect(remove('target', 'actor')).rejects.toMatchObject({ status: 409, code: 'LAST_ADMIN' })
    expect(tx.user.delete).not.toHaveBeenCalled()
  })

  it('deletes an admin when another enabled admin remains', async () => {
    arrange(ENABLED_ADMIN, 1)
    await expect(remove('target', 'actor')).resolves.toEqual({ id: 'target' })
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'target' } })
  })

  it('does not count admins when the target is an editor or already disabled', async () => {
    for (const target of [{ role: 'EDITOR' as const, isDisabled: false }, { role: 'ADMIN' as const, isDisabled: true }]) {
      tx.user.count.mockClear()
      arrange(target, 0)
      await update('target', { isDisabled: true }, 'actor')
      expect(tx.user.count).not.toHaveBeenCalled()
    }
  })

  it('refuses a self role change or self disable -> SELF_LOCKOUT, but allows an unchanged role', async () => {
    arrange(ENABLED_ADMIN, 5)
    await expect(update('me', { role: 'EDITOR' }, 'me')).rejects.toMatchObject({ status: 403 })
    await expect(update('me', { isDisabled: true }, 'me')).rejects.toMatchObject({ code: 'SELF_LOCKOUT' })
    expect(tx.user.update).not.toHaveBeenCalled()
    await update('me', { role: 'ADMIN', isDisabled: false, name: 'Me' }, 'me')
    expect(tx.user.update).toHaveBeenCalledTimes(1)
  })

  it('404s an unknown user', async () => {
    arrange(null, 0)
    await expect(update('nope', { name: 'x' }, 'actor')).rejects.toMatchObject({ status: 404 })
    await expect(remove('nope', 'actor')).rejects.toMatchObject({ status: 404 })
  })

  it('stores a hash, never the plain password, when the password changes', async () => {
    arrange({ role: 'EDITOR', isDisabled: false }, 0)
    await update('target', { password: 'a-brand-new-password' }, 'actor')
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { passwordHash: 'hashed' } }))
  })

  it('refuses deleting yourself before touching the database', async () => {
    await expect(remove('me', 'me')).rejects.toMatchObject({ status: 400, code: 'CANNOT_DELETE_SELF' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
