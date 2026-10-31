import { sessionClearCookie } from '@/lib/server/auth/session'
import { route } from '@/lib/server/http/route'
import { ok } from '@/lib/shared'

export const POST = route('user', () =>
  Response.json(ok({ loggedOut: true as const }), { headers: { 'set-cookie': sessionClearCookie() } }),
)
