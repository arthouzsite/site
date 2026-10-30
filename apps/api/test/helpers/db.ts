import { execSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../../src/generated/prisma/client'

const DEFAULT_TEST_DATABASE_URL = 'postgresql://localhost/arthouz_test'

function testDatabaseUrl(): string {
  return process.env.DATABASE_URL_TEST ?? DEFAULT_TEST_DATABASE_URL
}

let hasMigrated = false

export function migrateTestDb(): void {
  if (hasMigrated) return
  execSync('pnpm exec prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  })
  hasMigrated = true
}

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
