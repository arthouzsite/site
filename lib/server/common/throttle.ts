import { prisma } from '@/lib/server/prisma'

/** Rows idle for longer than this are deleted on the next claim; every throttle window is far shorter. */
const PRUNE_AFTER_SECONDS = 3600
const MS_PER_SECOND = 1000

export type ThrottleRule = { limit: number; ttl: number }

// All window arithmetic uses the database clock (UTC, matching what Prisma stores) so app hosts cannot disagree.

/**
 * Claims one slot for `key` in a fixed window of `rule.ttl` ms and says whether it is within `rule.limit`.
 * Claiming and the limit check are one statement, so a burst of parallel requests cannot all read a count below
 * the limit. Counters live in the LoginAttempt table (its primary key is the free-form `key`; callers namespace
 * theirs, e.g. `enquiry:<ip>`). A rejected claim still counts and does not extend the window.
 */
export async function claimThrottleSlot(key: string, rule: ThrottleRule): Promise<boolean> {
  const windowSeconds = rule.ttl / MS_PER_SECOND
  // Stale rows (any key) are pruned in the same transaction as the claim so the table cannot grow without bound.
  const [, rows] = await prisma.$transaction([
    prisma.$executeRaw`
      DELETE FROM "LoginAttempt"
      WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - make_interval(secs => ${PRUNE_AFTER_SECONDS}::double precision)`,
    prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "LoginAttempt" ("ip", "count", "windowStart")
    VALUES (${key}, 1, now() AT TIME ZONE 'UTC')
    ON CONFLICT ("ip") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSeconds}::double precision)
        THEN "LoginAttempt"."count" + 1 ELSE 1 END,
      "windowStart" = CASE WHEN "LoginAttempt"."windowStart" > (now() AT TIME ZONE 'UTC') - make_interval(secs => ${windowSeconds}::double precision)
        THEN "LoginAttempt"."windowStart" ELSE now() AT TIME ZONE 'UTC' END
    RETURNING "count"`,
  ])
  return (rows[0]?.count ?? 0) <= rule.limit
}
