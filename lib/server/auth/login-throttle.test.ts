import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrateTestDb, resetDb } from '@/tests/api/helpers/db'
import { prisma } from '@/lib/server/prisma'
import { LOGIN_THROTTLE } from './constants'
import { assertLoginAllowed, recordLoginFailure, resetLoginThrottle } from './login-throttle'

const IP = '203.0.113.7'
const failTimes = async (ip: string, times: number) => {
  for (let i = 0; i < times; i += 1) await recordLoginFailure(ip)
}

beforeAll(() => migrateTestDb())
beforeEach(() => resetDb())
afterAll(() => prisma.$disconnect())

describe('login throttle (database)', () => {
  it('allows five failures then rejects the sixth within 60 s and allows again after the window', async () => {
    for (let attempt = 0; attempt < LOGIN_THROTTLE.limit; attempt += 1) {
      await expect(assertLoginAllowed(IP)).resolves.toBeUndefined()
      await recordLoginFailure(IP)
    }
    await expect(assertLoginAllowed(IP)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' })

    // Move the window start past the ttl: the next attempt is allowed and counting restarts at one.
    await prisma.loginAttempt.update({ where: { ip: IP }, data: { windowStart: new Date(Date.now() - LOGIN_THROTTLE.ttl - 1000) } })
    await expect(assertLoginAllowed(IP)).resolves.toBeUndefined()
    await recordLoginFailure(IP)
    expect((await prisma.loginAttempt.findUniqueOrThrow({ where: { ip: IP } })).count).toBe(1)
  })

  it('counts atomically under concurrent failures', async () => {
    await Promise.all(Array.from({ length: 8 }, () => recordLoginFailure(IP)))
    expect((await prisma.loginAttempt.findUniqueOrThrow({ where: { ip: IP } })).count).toBe(8)
  })

  it('tracks each IP separately', async () => {
    await failTimes(IP, LOGIN_THROTTLE.limit)
    await expect(assertLoginAllowed('198.51.100.1')).resolves.toBeUndefined()
    await expect(assertLoginAllowed(IP)).rejects.toMatchObject({ status: 429 })
  })

  it('resetLoginThrottle clears the counter', async () => {
    await failTimes(IP, LOGIN_THROTTLE.limit)
    await resetLoginThrottle(IP)
    await expect(assertLoginAllowed(IP)).resolves.toBeUndefined()
    await expect(resetLoginThrottle('never-seen')).resolves.toBeUndefined()
  })
})
