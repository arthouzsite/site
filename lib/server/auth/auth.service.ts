import { unauthorized, type ApiException } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { hashPassword, verifyPassword } from './password'
import type { PublicUser } from './public-user'
import { signSession } from './session'

const INVALID_CREDENTIALS_CODE = 'INVALID_CREDENTIALS'
const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect'
// Verified against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH_SOURCE = 'timing-equalisation-placeholder'

let dummyHash: Promise<string> | undefined

function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(DUMMY_HASH_SOURCE)
  return dummyHash
}

export const invalidCredentials = (): ApiException => unauthorized(INVALID_CREDENTIALS_MESSAGE, INVALID_CREDENTIALS_CODE)

export async function login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
  const found = await prisma.user.findUnique({ where: { email } })
  const hash = found?.passwordHash ?? (await getDummyHash())
  const isValid = await verifyPassword(hash, password)
  if (!found || found.isDisabled || !isValid) throw invalidCredentials()

  await prisma.user.update({ where: { id: found.id }, data: { lastLoginAt: new Date() } })
  const user: PublicUser = { id: found.id, email: found.email, name: found.name, role: found.role }
  return { token: await signSession(found.id), user }
}
