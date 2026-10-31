import type { PublicUser } from '@/lib/server/auth/public-user'
import { unauthorized } from '@/lib/server/http/errors'

/** The signed-in user a role-gated route runs as; the wrapper guarantees one, this narrows the type. */
export function requireActor(user: PublicUser | null): PublicUser {
  if (!user) throw unauthorized()
  return user
}
