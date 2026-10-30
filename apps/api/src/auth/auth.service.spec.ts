import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { hashPassword, verifyPassword } from './password'

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

describe('AuthService.login', () => {
  const jwt = new JwtService({ secret: 'unit-test-secret-unit-test-secret-1234' })
  const build = (user: unknown) => {
    const update = jest.fn().mockResolvedValue({})
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user), update } }
    return { service: new AuthService(prisma as never, jwt), update }
  }

  it('returns token and public user, and records lastLoginAt', async () => {
    const passwordHash = await hashPassword('correct-horse-battery')
    const { service, update } = build({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash, isDisabled: false })
    const result = await service.login('a@b.c', 'correct-horse-battery')
    expect(result.user).toEqual({ id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN' })
    expect(jwt.decode(result.token)).toMatchObject({ sub: 'u1' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }))
  })

  it.each([
    ['unknown email', null],
    ['disabled user', { id: 'u1', email: 'a@b.c', name: 'A', role: 'ADMIN', passwordHash: 'x', isDisabled: true }],
  ])('rejects %s with INVALID_CREDENTIALS', async (_label, user) => {
    const { service } = build(user)
    await expect(service.login('a@b.c', 'whatever-password')).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
