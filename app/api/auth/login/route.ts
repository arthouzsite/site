import { login } from '@/lib/server/auth/auth.service'
import { verifyCaptcha } from '@/lib/server/auth/captcha'
import { clientIp } from '@/lib/server/auth/client-ip'
import { claimLoginAttempt, resetLoginThrottle } from '@/lib/server/auth/login-throttle'
import { sessionSetCookie } from '@/lib/server/auth/session'
import { ApiException } from '@/lib/server/http/errors'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { loginSchema, ok } from '@/lib/shared'

const WRONG_CAPTCHA_MESSAGE = 'The security code does not match. Try the new one.'

const wrongCaptcha = (): ApiException =>
  new ApiException(400, 'CAPTCHA_INVALID', WRONG_CAPTCHA_MESSAGE, { captchaAnswer: WRONG_CAPTCHA_MESSAGE })

export const POST = route('public', async ({ request }) => {
  // Malformed bodies are rejected before they cost a throttle slot; the slot is taken before the password is checked.
  const { email, password, captchaToken, captchaAnswer } = await parseBody(request, loginSchema)
  if (!verifyCaptcha(captchaToken, captchaAnswer)) throw wrongCaptcha()
  const ip = clientIp(request)
  await claimLoginAttempt(ip)
  const { token, user } = await login(email, password)
  await resetLoginThrottle(ip)
  return Response.json(ok({ user }), { headers: { 'set-cookie': sessionSetCookie(token) } })
})
