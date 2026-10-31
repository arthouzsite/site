import type { Role } from '@/lib/shared'
import { forbidden, unauthorized } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { PUBLIC_USER_SELECT, type PublicUser } from './public-user'
import { readSessionCookie, verifySession } from './session'

const FORBIDDEN_MESSAGE = 'You do not have permission to do that'

/** The signed-in user behind the session cookie, or null for a missing, invalid or expired token, or an unknown or disabled user. */
export async function currentUser(request: Request): Promise<PublicUser | null> {
  const token = readSessionCookie(request)
  if (!token) return null
  const claims = await verifySession(token)
  if (!claims) return null
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { ...PUBLIC_USER_SELECT, isDisabled: true } })
  if (!user || user.isDisabled) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/** Like currentUser, but throws 401 when signed out and 403 when `role` is given and does not match. */
export async function requireUser(request: Request, role?: Role): Promise<PublicUser> {
  const user = await currentUser(request)
  if (!user) throw unauthorized()
  if (role && user.role !== role) throw forbidden(FORBIDDEN_MESSAGE)
  return user
}
