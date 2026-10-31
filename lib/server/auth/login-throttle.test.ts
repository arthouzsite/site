import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrateTestDb, resetDb } from '@/tests/api/helpers/db'
import { prisma } from '@/lib/server/prisma'
import { LOGIN_THROTTLE } from './constants'
import { claimLoginAttempt, resetLoginThrottle } from './login-throttle'

const IP = '203.0.113.7'
const countFor = async (ip: string) => (await prisma.loginAttempt.findUniqueOrThrow({ where: { ip } })).count

beforeAll(() => migrateTestDb())
beforeEach(() => resetDb())
afterAll(() => prisma.$disconnect())

describe('login throttle (database)', () => {
  it('allows five claims then rejects the sixth within 60 s and allows again after the window', async () => {
    for (let attempt = 0; attempt < LOGIN_THROTTLE.limit; attempt += 1) {
      await expect(claimLoginAttempt(IP)).resolves.toBeUndefined()
    }
    await expect(claimLoginAttempt(IP)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' })

    // Move the window start past the ttl: the next claim is allowed and counting restarts at one.
    await prisma.loginAttempt.update({ where: { ip: IP }, data: { windowStart: new Date(Date.now() - LOGIN_THROTTLE.ttl - 1000) } })
    await expect(claimLoginAttempt(IP)).resolves.toBeUndefined()
    expect(await countFor(IP)).toBe(1)
  })

  it('lets only the first five of a concurrent burst through', async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => claimLoginAttempt(IP)))
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(results.length - rejected.length).toBe(LOGIN_THROTTLE.limit)
    for (const result of rejected) expect(result.reason).toMatchObject({ status: 429, code: 'RATE_LIMITED' })
    expect(await countFor(IP)).toBe(12)
  })

  it('does not extend the window while rejecting', async () => {
    for (let attempt = 0; attempt <= LOGIN_THROTTLE.limit; attempt += 1) await claimLoginAttempt(IP).catch(() => undefined)
    const before = (await prisma.loginAttempt.findUniqueOrThrow({ where: { ip: IP } })).windowStart
    await claimLoginAttempt(IP).catch(() => undefined)
    expect((await prisma.loginAttempt.findUniqueOrThrow({ where: { ip: IP } })).windowStart).toEqual(before)
  })

  it('tracks each IP separately', async () => {
    for (let attempt = 0; attempt < LOGIN_THROTTLE.limit; attempt += 1) await claimLoginAttempt(IP)
    await expect(claimLoginAttempt('198.51.100.1')).resolves.toBeUndefined()
    await expect(claimLoginAttempt(IP)).rejects.toMatchObject({ status: 429 })
  })

  it('resetLoginThrottle clears the counter', async () => {
    for (let attempt = 0; attempt < LOGIN_THROTTLE.limit; attempt += 1) await claimLoginAttempt(IP)
    await resetLoginThrottle(IP)
    await expect(claimLoginAttempt(IP)).resolves.toBeUndefined()
    await expect(resetLoginThrottle('never-seen')).resolves.toBeUndefined()
  })
})
