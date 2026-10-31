import { login } from '@/lib/server/auth/auth.service'
import { clientIp } from '@/lib/server/auth/client-ip'
import { claimLoginAttempt, resetLoginThrottle } from '@/lib/server/auth/login-throttle'
import { sessionSetCookie } from '@/lib/server/auth/session'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { loginSchema, ok } from '@/lib/shared'

export const POST = route('public', async ({ request }) => {
  // Malformed bodies are rejected before they cost a throttle slot; the slot is taken before the password is checked.
  const { email, password } = await parseBody(request, loginSchema)
  const ip = clientIp(request)
  await claimLoginAttempt(ip)
  const { token, user } = await login(email, password)
  await resetLoginThrottle(ip)
  return Response.json(ok({ user }), { headers: { 'set-cookie': sessionSetCookie(token) } })
})
