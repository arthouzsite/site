import { tooManyRequests } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { LOGIN_THROTTLE } from './constants'

const WINDOW_SECONDS = LOGIN_THROTTLE.ttl / 1000
const THROTTLED_MESSAGE = 'Too many sign-in attempts. Try again in a minute.'

// All window arithmetic uses the database clock (UTC, matching what Prisma stores) so app hosts cannot disagree.

/**
 * Claims one login attempt for the IP before the password is checked. Claiming and the limit check are one
 * statement, so a burst of parallel requests cannot all read a count below the limit: the sixth and later
 * claims inside the window get 429 RATE_LIMITED. A claim is kept on failure and released by resetLoginThrottle on success.
 */
export async function claimLoginAttempt(ip: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "LoginAttempt" ("ip", "count", "windowStart")
    VALUES (${ip}, 1, now() AT TIME ZONE 'UTC')
    ON CONFLICT ("ip") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${WINDOW_SECONDS}::double precision)
        THEN "LoginAttempt"."count" + 1 ELSE 1 END,
      "windowStart" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${WINDOW_SECONDS}::double precision)
        THEN "LoginAttempt"."windowStart" ELSE now() AT TIME ZONE 'UTC' END
    RETURNING "count"`
  if ((rows[0]?.count ?? 0) > LOGIN_THROTTLE.limit) throw tooManyRequests('RATE_LIMITED', THROTTLED_MESSAGE)
}

export async function resetLoginThrottle(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } })
}
