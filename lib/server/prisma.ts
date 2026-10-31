import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/server/generated/prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

// Next dev reloads modules on every edit; reuse one client so connections are not leaked.
if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
