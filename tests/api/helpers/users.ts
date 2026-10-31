import type { User } from '@/lib/server/generated/prisma/client'
import { hashPassword } from '@/lib/server/auth/password'
import { prisma } from '@/lib/server/prisma'
import { call, SESSION_COOKIE_NAME } from './client'

export const TEST_PASSWORD = 'correct-horse-battery'

type SeedUser = { email: string; role: 'ADMIN' | 'EDITOR'; name?: string; isDisabled?: boolean }

export async function seedUser(user: SeedUser): Promise<User> {
  return prisma.user.create({
    data: {
      email: user.email,
      name: user.name ?? 'Test User',
      role: user.role,
      isDisabled: user.isDisabled ?? false,
      passwordHash: await hashPassword(TEST_PASSWORD),
    },
  })
}

/** Signs in through the real login route and returns the ah_session token value. */
export async function loginAs(email: string, password: string = TEST_PASSWORD): Promise<string> {
  const res = await call('POST', '/api/auth/login', { body: { email, password } })
  if (res.status !== 200) throw new Error(`loginAs(${email}) failed with ${res.status}: ${JSON.stringify(res.body)}`)
  const header = res.headers.get('set-cookie') ?? ''
  const match = new RegExp(`(?:^|,\\s*)${SESSION_COOKIE_NAME}=([^;]*)`).exec(header)
  if (!match?.[1]) throw new Error('loginAs: no session cookie in the login response')
  return match[1]
}
