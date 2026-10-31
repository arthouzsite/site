import { isInvalidCredentials, login } from '@/lib/server/auth/auth.service'
import { clientIp } from '@/lib/server/auth/client-ip'
import { assertLoginAllowed, recordLoginFailure, resetLoginThrottle } from '@/lib/server/auth/login-throttle'
import { sessionSetCookie } from '@/lib/server/auth/session'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { loginSchema, ok } from '@/lib/shared'

export const POST = route('public', async ({ request }) => {
  const ip = clientIp(request)
  await assertLoginAllowed(ip)
  const { email, password } = await parseBody(request, loginSchema)
  try {
    const { token, user } = await login(email, password)
    await resetLoginThrottle(ip)
    return Response.json(ok({ user }), { headers: { 'set-cookie': sessionSetCookie(token) } })
  } catch (error) {
    if (isInvalidCredentials(error)) await recordLoginFailure(ip)
    throw error
  }
})
