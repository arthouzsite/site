import { execSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@/lib/server/generated/prisma/client'
import { resolveApiTestDatabaseUrl } from '@/tests/db-guard'

const testDatabaseUrl = (): string => resolveApiTestDatabaseUrl()

let hasMigrated = false

export function migrateTestDb(): void {
  if (hasMigrated) return
  execSync('pnpm exec prisma migrate deploy', {
    cwd: process.cwd(),
    // prisma.config.ts prefers DIRECT_DATABASE_URL for migrations; both must point at the test database.
    env: { ...process.env, DATABASE_URL: testDatabaseUrl(), DIRECT_DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  })
  hasMigrated = true
}

/** Truncates every model, including LoginAttempt, so each spec starts with an empty throttle too. */
export async function resetDb(): Promise<void> {
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
  try {
    const tables = Object.values(Prisma.ModelName)
      .map((name) => `"${name}"`)
      .join(', ')
    await client.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`)
  } finally {
    await client.$disconnect()
  }
}
