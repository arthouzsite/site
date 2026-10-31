import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { login } from './auth.service'
import { hashPassword, verifyPassword } from './password'
import { verifySession } from './session'

vi.mock('@/lib/server/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), update: vi.fn() } } }))

const findUnique = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>
const update = vi.mocked(prisma.user.update) as unknown as ReturnType<typeof vi.fn>

describe('password', () => {
  it('hashes with argon2id and verifies', async () => {
    const hash = await hashPassword('correct-horse-battery')
    expect(hash).toContain('$argon2id$')
    await expect(verifyPassword(hash, 'correct-horse-battery')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false)
  })

  it('returns false for a malformed hash', async () => {
    await expect(verifyPassword('not-a-hash', 'x')).resolves.toBe(false)
  })
})

describe('login', () => {
  beforeEach(() => {
    findUnique.mockReset()
    update.mockReset().mockResolvedValue({})
  })

  it('returns token and public user, and records lastLoginAt', async () => {
    const passwordHash = await hashPassword('correct-horse-battery')
    findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash, isDisabled: false })
    const result = await login('a@b.c', 'correct-horse-battery')
    expect(result.user).toEqual({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN' })
    await expect(verifySession(result.token)).resolves.toEqual({ sub: 'u1' })
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { lastLoginAt: expect.any(Date) } })
  })

  it('rejects a wrong password with INVALID_CREDENTIALS and does not touch lastLoginAt', async () => {
    const passwordHash = await hashPassword('correct-horse-battery')
    findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash, isDisabled: false })
    await expect(login('a@b.c', 'wrong-wrong-wrong')).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' })
    expect(update).not.toHaveBeenCalled()
  })

  it.each([
    ['unknown email', null],
    ['disabled user', { id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash: 'x', isDisabled: true }],
  ])('rejects %s with INVALID_CREDENTIALS', async (_label, user) => {
    findUnique.mockResolvedValue(user)
    await expect(login('a@b.c', 'whatever-password')).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' })
    expect(update).not.toHaveBeenCalled()
  })
})
