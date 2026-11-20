import { createCaptcha } from '@/lib/server/auth/captcha'
import { route } from '@/lib/server/http/route'

// A new challenge every time: never prerendered or cached.
export const dynamic = 'force-dynamic'

/** The picture to show on the sign-in form and the token to send back with the answer. */
export const GET = route('public', () => {
  const { token, image } = createCaptcha()
  return { token, image }
})
