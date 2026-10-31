import { SignJWT } from 'jose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { currentUser, requireUser } from './current-user'
import { signSession } from './session'

vi.mock('@/lib/server/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }))

const findUnique = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>
const ROW = { id: 'u1', email: 'a@example.test', name: 'Ada', role: 'ADMIN', isDisabled: false }

async function withCookie(userId = 'u1'): Promise<Request> {
  return new Request('http://localhost/api/auth/me', { headers: { cookie: `ah_session=${await signSession(userId)}` } })
}

beforeEach(() => findUnique.mockReset())

describe('currentUser', () => {
  it('returns the public user for a valid token', async () => {
    findUnique.mockResolvedValue(ROW)
    await expect(currentUser(await withCookie())).resolves.toEqual({ id: 'u1', email: 'a@example.test', name: 'Ada', role: 'ADMIN' })
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true, email: true, name: true, role: true, isDisabled: true } })
  })

  it('returns null without a cookie and does not query the database', async () => {
    await expect(currentUser(new Request('http://localhost/'))).resolves.toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('returns null for a malformed or expired token instead of throwing', async () => {
    const garbage = new Request('http://localhost/', { headers: { cookie: 'ah_session=garbage' } })
    await expect(currentUser(garbage)).resolves.toBeNull()

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const expired = await new SignJWT({}).setSubject('u1').setProtectedHeader({ alg: 'HS256' }).setIssuedAt(1).setExpirationTime(2).sign(secret)
    const request = new Request('http://localhost/', { headers: { cookie: `ah_session=${expired}` } })
    await expect(currentUser(request)).resolves.toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('returns null for a valid token whose user is disabled or missing', async () => {
    findUnique.mockResolvedValueOnce({ ...ROW, isDisabled: true })
    await expect(currentUser(await withCookie())).resolves.toBeNull()
    findUnique.mockResolvedValueOnce(null)
    await expect(currentUser(await withCookie())).resolves.toBeNull()
  })
})

describe('requireUser', () => {
  it('returns the user when signed in', async () => {
    findUnique.mockResolvedValue({ ...ROW, role: 'EDITOR' })
    await expect(requireUser(await withCookie())).resolves.toMatchObject({ id: 'u1', role: 'EDITOR' })
  })

  it('throws 401 UNAUTHORIZED when signed out', async () => {
    await expect(requireUser(new Request('http://localhost/'))).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
  })

  it('throws 403 FORBIDDEN when the role does not match', async () => {
    findUnique.mockResolvedValue({ ...ROW, role: 'EDITOR' })
    await expect(requireUser(await withCookie(), 'ADMIN')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('accepts a matching role', async () => {
    findUnique.mockResolvedValue(ROW)
    await expect(requireUser(await withCookie(), 'ADMIN')).resolves.toMatchObject({ role: 'ADMIN' })
  })
})
