import { claimThrottleSlot } from '@/lib/server/common/throttle'
import { tooManyRequests } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { LOGIN_THROTTLE } from './constants'

const THROTTLED_MESSAGE = 'Too many sign-in attempts. Try again in a minute.'

/**
 * Claims one login attempt for the IP before the password is checked: the sixth and later claims inside the
 * window get 429 RATE_LIMITED. A claim is kept on failure and released by resetLoginThrottle on success.
 */
export async function claimLoginAttempt(ip: string): Promise<void> {
  if (!(await claimThrottleSlot(ip, LOGIN_THROTTLE))) throw tooManyRequests('RATE_LIMITED', THROTTLED_MESSAGE)
}

export async function resetLoginThrottle(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } })
}
