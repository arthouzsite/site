import { tooManyRequests } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { LOGIN_THROTTLE } from './constants'

const WINDOW_SECONDS = LOGIN_THROTTLE.ttl / 1000
const THROTTLED_MESSAGE = 'Too many sign-in attempts. Try again in a minute.'

// All window arithmetic uses the database clock (UTC, matching what Prisma stores) so app hosts cannot disagree.

/** Rejects with 429 RATE_LIMITED once an IP has used up its failures inside the current window. */
export async function assertLoginAllowed(ip: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "LoginAttempt"
    WHERE "ip" = ${ip}
      AND "windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${WINDOW_SECONDS}::double precision)`
  if ((rows[0]?.count ?? 0) >= LOGIN_THROTTLE.limit) throw tooManyRequests('RATE_LIMITED', THROTTLED_MESSAGE)
}

/** Counts one failure; an expired window starts again at one. Single statement, so concurrent failures are not lost. */
export async function recordLoginFailure(ip: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "LoginAttempt" ("ip", "count", "windowStart")
    VALUES (${ip}, 1, now() AT TIME ZONE 'UTC')
    ON CONFLICT ("ip") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${WINDOW_SECONDS}::double precision)
        THEN "LoginAttempt"."count" + 1 ELSE 1 END,
      "windowStart" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${WINDOW_SECONDS}::double precision)
        THEN "LoginAttempt"."windowStart" ELSE now() AT TIME ZONE 'UTC' END`
}

export async function resetLoginThrottle(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } })
}
