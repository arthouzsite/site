import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { migrateTestDb, resetDb } from '@/tests/api/helpers/db'
import { seedUser, TEST_PASSWORD } from '@/tests/api/helpers/users'
import { verifyPassword } from './password'
import { RANDOM_PASSWORD_LENGTH, randomPassword, setRandomPassword } from './random-password'

describe('random password', () => {
  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('is long, different every time and free of look-alike characters', () => {
    const first = randomPassword()
    expect(first).toHaveLength(RANDOM_PASSWORD_LENGTH)
    expect(first).toMatch(/^[a-zA-Z2-9]+$/)
    expect(first).not.toMatch(/[0O1lI]/)
    expect(randomPassword()).not.toBe(first)
  })

  it('replaces the stored password, so only the new one signs in', async () => {
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    const password = await setRandomPassword(' Admin@Example.test ')
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.test' } })
    expect(password).toHaveLength(RANDOM_PASSWORD_LENGTH)
    expect(await verifyPassword(passwordHash, password!)).toBe(true)
    expect(await verifyPassword(passwordHash, TEST_PASSWORD)).toBe(false)
  })

  it('returns null for an email nobody has', async () => {
    expect(await setRandomPassword('nobody@example.test')).toBeNull()
  })
})
